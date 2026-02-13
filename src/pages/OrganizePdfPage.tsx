import { useEffect, useState, type DragEvent } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { reorderPages, removePages, getPdfPageCount, downloadBlob } from '../lib/pdf-pages';
import { GripVertical, Trash2 } from 'lucide-react';

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function OrganizePdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isLoadingPageCount, setIsLoadingPageCount] = useState(false);
    const [pageOrder, setPageOrder] = useState<number[]>([]);
    const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!file) return;
        setIsLoadingPageCount(true);
        setPageOrder([]);
        setDeletedPages(new Set());
        setThumbnails({});
        setResult(null);
        setError(null);

        getPdfPageCount(file)
            .then(count => {
                setPageCount(count);
                setPageOrder(Array.from({ length: count }, (_, i) => i + 1));
            })
            .catch(err => setError(err instanceof Error ? err.message : 'Failed to read PDF'))
            .finally(() => setIsLoadingPageCount(false));
    }, [file]);

    // Render thumbnails
    useEffect(() => {
        if (!file || !pageCount) return;
        let cancelled = false;
        const render = async () => {
            const fileBytes = new Uint8Array(await file.arrayBuffer());
            const pdfDoc = await getDocument({ data: fileBytes }).promise;
            const max = Math.min(pageCount, 50);
            for (let i = 1; i <= max; i++) {
                if (cancelled) break;
                try {
                    const page = await pdfDoc.getPage(i);
                    const baseVp = page.getViewport({ scale: 1 });
                    const scale = 140 / baseVp.height;
                    const vp = page.getViewport({ scale });
                    const dpr = window.devicePixelRatio || 1;
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(vp.width * dpr);
                    canvas.height = Math.floor(vp.height * dpr);
                    const ctx = canvas.getContext('2d')!;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
                    if (!cancelled) setThumbnails(prev => ({ ...prev, [i]: canvas.toDataURL('image/jpeg', 0.8) }));
                } catch { /* skip */ }
            }
        };
        render();
        return () => { cancelled = true; };
    }, [file, pageCount]);

    const visiblePages = pageOrder.filter(p => !deletedPages.has(p));

    const handleDragStart = (index: number) => (e: DragEvent) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (index: number) => (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDrop = (dropIndex: number) => (e: DragEvent) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        // Work on visible pages, then reconstruct full order
        const newVisible = [...visiblePages];
        const [moved] = newVisible.splice(draggedIndex, 1);
        newVisible.splice(dropIndex, 0, moved);

        // Reconstruct full order: visible pages in new order + deleted pages at end
        setPageOrder([...newVisible, ...Array.from(deletedPages)]);
        setDraggedIndex(null);
        setDragOverIndex(null);
        setResult(null);
    };

    const handleDelete = (pageNum: number) => {
        if (visiblePages.length <= 1) {
            setError('Cannot delete all pages. At least one page must remain.');
            return;
        }
        setDeletedPages(prev => new Set([...prev, pageNum]));
        setResult(null);
    };

    const handleRestore = (pageNum: number) => {
        setDeletedPages(prev => {
            const next = new Set(prev);
            next.delete(pageNum);
            return next;
        });
        setResult(null);
    };

    const isModified = () => {
        if (deletedPages.size > 0) return true;
        if (!pageCount) return false;
        const original = Array.from({ length: pageCount }, (_, i) => i + 1);
        return visiblePages.some((p, i) => p !== original[i]) || visiblePages.length !== original.length;
    };

    const handleApply = async () => {
        if (!file) return;
        setIsProcessing(true);
        setProgress(20);
        setError(null);
        try {
            let blob: Blob;
            if (deletedPages.size > 0 && visiblePages.some((p, i) => p !== i + 1)) {
                // Both reorder and delete: use reorderPages with only visible pages
                blob = await reorderPages(file, visiblePages);
            } else if (deletedPages.size > 0) {
                blob = await removePages(file, Array.from(deletedPages));
            } else {
                blob = await reorderPages(file, visiblePages);
            }
            setProgress(100);
            setResult(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to organize PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result, `${baseName}_organized.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setPageCount(null);
        setPageOrder([]);
        setDeletedPages(new Set());
        setThumbnails({});
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="Organize PDF" description="Drag and drop to reorder pages, or delete pages you don't need.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {isLoadingPageCount && (
                <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-wide text-sm">Reading PDF...</p>
                </div>
            )}

            {file && pageCount && !result && !isProcessing && (
                <>
                    <p className="font-bold text-gray-600 mb-4">{pageCount} page{pageCount !== 1 ? 's' : ''} — drag to reorder, click ✕ to remove</p>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {visiblePages.map((pageNum, index) => (
                            <div
                                key={pageNum}
                                draggable
                                onDragStart={handleDragStart(index)}
                                onDragOver={handleDragOver(index)}
                                onDrop={handleDrop(index)}
                                onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                                className={`relative group rounded-lg overflow-hidden border-4 cursor-grab active:cursor-grabbing transition-all ${dragOverIndex === index ? 'border-blue-500 scale-105' : draggedIndex === index ? 'opacity-50 border-gray-300' : 'border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                {thumbnails[pageNum] ? (
                                    <img src={thumbnails[pageNum]} alt={`Page ${pageNum}`} className="w-full h-auto pointer-events-none" />
                                ) : (
                                    <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs">{pageNum}</span>
                                    </div>
                                )}
                                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(pageNum); }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-opacity hover:bg-red-600"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                                <span className="absolute bottom-0 inset-x-0 text-center text-xs font-bold py-1 bg-black/70 text-white">
                                    {pageNum}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Deleted pages */}
                    {deletedPages.size > 0 && (
                        <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                            <p className="font-bold text-red-600 text-sm mb-2">Deleted pages (click to restore):</p>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(deletedPages).sort((a, b) => a - b).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        onClick={() => handleRestore(pageNum)}
                                        className="px-3 py-1 text-sm font-bold bg-white border-2 border-red-300 rounded hover:bg-red-100 transition-colors"
                                    >
                                        Page {pageNum} ↩
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-gray-200">
                        <p className="text-gray-500">
                            {isModified() ? (
                                <>
                                    {deletedPages.size > 0 && <><strong className="text-red-600">{deletedPages.size}</strong> deleted · </>}
                                    <strong>{visiblePages.length}</strong> pages in new order
                                </>
                            ) : 'Drag pages to reorder or click ✕ to remove'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                            <button onClick={handleApply} disabled={!isModified()} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Organizing pages..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={() => setError(null)} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Dismiss</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">PDF Organized!</h3>
                    <p className="text-gray-600 mb-6">{visiblePages.length} pages in your new PDF.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
