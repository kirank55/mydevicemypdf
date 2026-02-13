import { useEffect, useMemo, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { removePages, getPdfPageCount, downloadBlob } from '../lib/pdf-pages';

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function RemovePagesPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isLoadingPageCount, setIsLoadingPageCount] = useState(false);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ blob: Blob; removedCount: number; remainingCount: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        setIsLoadingPageCount(true);
        setSelectedPages(new Set());
        setThumbnails({});
        setResult(null);
        setError(null);

        getPdfPageCount(file)
            .then(count => setPageCount(count))
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
            const maxPreview = Math.min(pageCount, 50);

            for (let i = 1; i <= maxPreview; i++) {
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
                    if (!cancelled) {
                        setThumbnails(prev => ({ ...prev, [i]: canvas.toDataURL('image/jpeg', 0.8) }));
                    }
                } catch { /* skip failed thumbnails */ }
            }
        };
        render();
        return () => { cancelled = true; };
    }, [file, pageCount]);

    const allPages = useMemo(() => {
        if (!pageCount) return [];
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }, [pageCount]);

    const togglePage = (pageNum: number) => {
        setSelectedPages(prev => {
            const next = new Set(prev);
            if (next.has(pageNum)) next.delete(pageNum);
            else next.add(pageNum);
            return next;
        });
        setResult(null);
    };

    const handleRemove = async () => {
        if (!file || selectedPages.size === 0 || !pageCount) return;
        if (selectedPages.size >= pageCount) {
            setError('Cannot remove all pages. At least one page must remain.');
            return;
        }

        setIsProcessing(true);
        setProgress(10);
        setError(null);

        try {
            setProgress(30);
            const blob = await removePages(file, Array.from(selectedPages));
            setProgress(100);
            setResult({
                blob,
                removedCount: selectedPages.size,
                remainingCount: pageCount - selectedPages.size,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove pages');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result.blob, `${baseName}_pages_removed.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setPageCount(null);
        setSelectedPages(new Set());
        setThumbnails({});
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="Remove Pages" description="Select and delete specific pages from your PDF file.">
            {/* File upload */}
            {!file && (
                <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />
            )}

            {/* Loading */}
            {isLoadingPageCount && (
                <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-wide text-sm">Reading PDF...</p>
                </div>
            )}

            {/* Page Grid */}
            {file && pageCount && !result && !isProcessing && (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-bold text-gray-600">
                            {pageCount} page{pageCount !== 1 ? 's' : ''} — select pages to remove
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedPages(new Set(allPages))}
                                className="px-3 py-1 text-sm font-bold uppercase tracking-wide border-2 border-black rounded hover:bg-gray-100 transition-colors"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedPages(new Set())}
                                className="px-3 py-1 text-sm font-bold uppercase tracking-wide border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {allPages.map(pageNum => (
                            <button
                                key={pageNum}
                                onClick={() => togglePage(pageNum)}
                                className={`relative group rounded-lg overflow-hidden border-4 transition-all ${selectedPages.has(pageNum)
                                    ? 'border-red-500 ring-2 ring-red-300 scale-95'
                                    : 'border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                {thumbnails[pageNum] ? (
                                    <img src={thumbnails[pageNum]} alt={`Page ${pageNum}`} className="w-full h-auto" />
                                ) : (
                                    <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs">{pageNum}</span>
                                    </div>
                                )}
                                <span className={`absolute bottom-0 inset-x-0 text-center text-xs font-bold py-1 ${selectedPages.has(pageNum)
                                    ? 'bg-red-500 text-white'
                                    : 'bg-black/70 text-white'
                                    }`}>
                                    {selectedPages.has(pageNum) ? `✕ ${pageNum}` : pageNum}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-gray-200">
                        <p className="text-gray-500">
                            {selectedPages.size > 0 ? (
                                <><strong className="text-red-600">{selectedPages.size}</strong> page{selectedPages.size !== 1 ? 's' : ''} selected for removal</>
                            ) : 'Click pages to select them for removal'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={selectedPages.size === 0}
                                className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-red-600 border-4 border-red-600 rounded-lg hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#991b1b] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Remove {selectedPages.size > 0 ? `${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''}` : 'Pages'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Processing */}
            {isProcessing && <ProgressIndicator progress={progress} status="Removing pages..." />}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">
                        Try Again
                    </button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">Pages Removed!</h3>
                    <p className="text-gray-600 mb-6">
                        Removed {result.removedCount} page{result.removedCount !== 1 ? 's' : ''}. {result.remainingCount} page{result.remainingCount !== 1 ? 's' : ''} remaining.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleDownload}
                            className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all"
                        >
                            Download PDF
                        </button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">
                            Process Another
                        </button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
