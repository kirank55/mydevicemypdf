import { useEffect, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { rotatePages, getPdfPageCount, downloadBlob } from '../lib/pdf-pages';
import { RotateCw } from 'lucide-react';

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function RotatePdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isLoadingPageCount, setIsLoadingPageCount] = useState(false);
    const [rotations, setRotations] = useState<Record<number, number>>({});
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        setIsLoadingPageCount(true);
        setRotations({});
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

    const rotatePage = (pageNum: number) => {
        setRotations(prev => {
            const current = prev[pageNum] || 0;
            const next = (current + 90) % 360;
            if (next === 0) {
                const { [pageNum]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [pageNum]: next };
        });
        setResult(null);
    };

    const rotateAll = (deg: number) => {
        if (!pageCount) return;
        const newRotations: Record<number, number> = {};
        for (let i = 1; i <= pageCount; i++) {
            const current = rotations[i] || 0;
            const next = (current + deg) % 360;
            if (next !== 0) newRotations[i] = next;
        }
        setRotations(newRotations);
        setResult(null);
    };

    const handleApply = async () => {
        if (!file || Object.keys(rotations).length === 0) return;
        setIsProcessing(true);
        setProgress(20);
        setError(null);
        try {
            setProgress(50);
            const blob = await rotatePages(file, rotations);
            setProgress(100);
            setResult(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to rotate pages');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result, `${baseName}_rotated.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setPageCount(null);
        setRotations({});
        setThumbnails({});
        setResult(null);
        setError(null);
        setProgress(0);
    };

    const rotatedCount = Object.keys(rotations).length;

    return (
        <ToolPageTemplate title="Rotate PDF" description="Rotate pages within your PDF document.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {isLoadingPageCount && (
                <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-wide text-sm">Reading PDF...</p>
                </div>
            )}

            {file && pageCount && !result && !isProcessing && (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-bold text-gray-600">{pageCount} page{pageCount !== 1 ? 's' : ''} — click to rotate 90°</p>
                        <div className="flex gap-2">
                            <button onClick={() => rotateAll(90)} className="px-3 py-1 text-sm font-bold uppercase tracking-wide border-2 border-black rounded hover:bg-gray-100 transition-colors">
                                Rotate All 90°
                            </button>
                            <button onClick={() => rotateAll(180)} className="px-3 py-1 text-sm font-bold uppercase tracking-wide border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors">
                                Rotate All 180°
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => (
                            <button
                                key={pageNum}
                                onClick={() => rotatePage(pageNum)}
                                className={`relative group rounded-lg overflow-hidden border-4 transition-all ${rotations[pageNum] ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                <div style={{ transform: `rotate(${rotations[pageNum] || 0}deg)`, transition: 'transform 0.3s' }}>
                                    {thumbnails[pageNum] ? (
                                        <img src={thumbnails[pageNum]} alt={`Page ${pageNum}`} className="w-full h-auto" />
                                    ) : (
                                        <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center">
                                            <span className="text-gray-400 text-xs">{pageNum}</span>
                                        </div>
                                    )}
                                </div>
                                {rotations[pageNum] && (
                                    <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                        {rotations[pageNum]}°
                                    </span>
                                )}
                                <span className="absolute bottom-0 inset-x-0 text-center text-xs font-bold py-1 bg-black/70 text-white">
                                    {pageNum}
                                </span>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                    <RotateCw className="w-6 h-6 text-white" />
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-gray-200">
                        <p className="text-gray-500">
                            {rotatedCount > 0 ? <><strong className="text-blue-600">{rotatedCount}</strong> page{rotatedCount !== 1 ? 's' : ''} will be rotated</> : 'Click pages to rotate them'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                            <button onClick={handleApply} disabled={rotatedCount === 0} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                Apply Rotation
                            </button>
                        </div>
                    </div>
                </>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Rotating pages..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Try Again</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">Pages Rotated!</h3>
                    <p className="text-gray-600 mb-6">{rotatedCount} page{rotatedCount !== 1 ? 's' : ''} rotated successfully.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
