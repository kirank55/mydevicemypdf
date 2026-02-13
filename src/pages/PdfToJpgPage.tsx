import { useEffect, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { downloadBlob, formatBytes } from '../lib/shared';

GlobalWorkerOptions.workerSrc = pdfWorker;

type ImageFormat = 'jpeg' | 'png';

const DPI_OPTIONS = [72, 150, 300] as const;
const QUALITY_OPTIONS = [
    { label: 'Low', value: 0.5 },
    { label: 'Medium', value: 0.75 },
    { label: 'High', value: 0.92 },
] as const;

export default function PdfToJpgPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isLoadingPageCount, setIsLoadingPageCount] = useState(false);
    const [format, setFormat] = useState<ImageFormat>('jpeg');
    const [dpi, setDpi] = useState<number>(150);
    const [quality, setQuality] = useState<number>(0.92);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [images, setImages] = useState<{ data: Blob; name: string }[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        setIsLoadingPageCount(true);
        setImages([]);
        setPreviews([]);
        setError(null);

        const load = async () => {
            try {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const pdf = await getDocument({ data: bytes }).promise;
                setPageCount(pdf.numPages);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to read PDF');
            } finally {
                setIsLoadingPageCount(false);
            }
        };
        load();
    }, [file]);

    const handleConvert = async () => {
        if (!file || !pageCount) return;
        setIsProcessing(true);
        setProgress(0);
        setImages([]);
        setPreviews([]);
        setError(null);

        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const pdf = await getDocument({ data: bytes }).promise;
            const baseName = file.name.replace(/\.pdf$/i, '');
            const scale = dpi / 72;
            const results: { data: Blob; name: string }[] = [];
            const previewUrls: string[] = [];

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvas, canvasContext: ctx, viewport }).promise;

                const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
                const ext = format === 'png' ? 'png' : 'jpg';

                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob(
                        (b) => resolve(b!),
                        mimeType,
                        format === 'jpeg' ? quality : undefined,
                    );
                });

                results.push({ data: blob, name: `${baseName}_page_${i}.${ext}` });
                previewUrls.push(canvas.toDataURL(mimeType, 0.5)); // Low quality preview

                setProgress(Math.round((i / pageCount) * 100));
            }

            setImages(results);
            setPreviews(previewUrls);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to convert PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadSingle = (index: number) => {
        downloadBlob(images[index].data, images[index].name);
    };

    const downloadAll = async () => {
        if (images.length === 1) {
            downloadSingle(0);
            return;
        }
        const zip = new JSZip();
        images.forEach(img => zip.file(img.name, img.data));
        const blob = await zip.generateAsync({ type: 'blob' });
        const baseName = file?.name.replace(/\.pdf$/i, '') || 'pdf_images';
        downloadBlob(blob, `${baseName}_images.zip`);
    };

    const handleReset = () => {
        setFile(null);
        setPageCount(null);
        setImages([]);
        setPreviews([]);
        setError(null);
        setProgress(0);
    };

    const totalSize = images.reduce((sum, img) => sum + img.data.size, 0);

    return (
        <ToolPageTemplate title="PDF to JPG" description="Extract pages from your PDF as high-quality images.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {isLoadingPageCount && (
                <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-wide text-sm">Reading PDF...</p>
                </div>
            )}

            {/* Settings */}
            {file && pageCount && images.length === 0 && !isProcessing && (
                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 border-4 border-gray-200 rounded-lg space-y-4">
                        <p className="font-bold text-gray-600">{file.name} — {pageCount} page{pageCount !== 1 ? 's' : ''}</p>

                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Format</label>
                                <div className="flex gap-2">
                                    {(['jpeg', 'png'] as const).map(f => (
                                        <button key={f} onClick={() => setFormat(f)} className={`flex-1 px-4 py-2 font-bold uppercase text-sm rounded-lg border-4 transition-all ${format === f ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                                            {f === 'jpeg' ? 'JPG' : 'PNG'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">DPI</label>
                                <div className="flex gap-2">
                                    {DPI_OPTIONS.map(d => (
                                        <button key={d} onClick={() => setDpi(d)} className={`flex-1 px-3 py-2 font-bold text-sm rounded-lg border-4 transition-all ${dpi === d ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {format === 'jpeg' && (
                                <div>
                                    <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Quality</label>
                                    <div className="flex gap-2">
                                        {QUALITY_OPTIONS.map(q => (
                                            <button key={q.value} onClick={() => setQuality(q.value)} className={`flex-1 px-3 py-2 font-bold text-sm rounded-lg border-4 transition-all ${quality === q.value ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                        <button onClick={handleConvert} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">
                            Convert to {format === 'jpeg' ? 'JPG' : 'PNG'}
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status={`Converting page ${Math.ceil((progress / 100) * (pageCount || 1))} of ${pageCount}...`} />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Try Again</button>
                </div>
            )}

            {/* Results */}
            {images.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-600">{images.length} image{images.length !== 1 ? 's' : ''} — {formatBytes(totalSize)} total</p>
                        <div className="flex gap-3">
                            <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                            <button onClick={downloadAll} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">
                                {images.length === 1 ? 'Download Image' : 'Download All as ZIP'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group rounded-lg overflow-hidden border-4 border-gray-200 hover:border-gray-400 transition-all">
                                <img src={preview} alt={`Page ${index + 1}`} className="w-full h-auto" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                                    <button
                                        onClick={() => downloadSingle(index)}
                                        className="px-4 py-2 font-bold text-sm uppercase tracking-wide text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        Download
                                    </button>
                                </div>
                                <span className="absolute bottom-0 inset-x-0 text-center text-xs font-bold py-1 bg-black/70 text-white">
                                    Page {index + 1} — {formatBytes(images[index].data.size)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
