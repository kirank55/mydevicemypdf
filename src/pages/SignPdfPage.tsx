import { useRef, useState, useEffect } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { downloadBlob } from '../lib/shared';
import { Eraser } from 'lucide-react';

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function SignPdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [selectedPage, setSelectedPage] = useState(1);
    const [pagePreview, setPagePreview] = useState<string | null>(null);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Signature position on preview (as relative % of preview)
    const [sigPosition, setSigPosition] = useState({ x: 60, y: 75 });
    const [sigSize] = useState({ w: 150, h: 60 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Load PDF page count
    useEffect(() => {
        if (!file) return;
        const load = async () => {
            try {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const pdf = await getDocument({ data: bytes }).promise;
                setPageCount(pdf.numPages);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to read PDF');
            }
        };
        load();
    }, [file]);

    // Render page preview
    useEffect(() => {
        if (!file || !pageCount) return;
        let cancelled = false;
        const render = async () => {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const pdf = await getDocument({ data: bytes }).promise;
            const page = await pdf.getPage(selectedPage);
            const vp = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width;
            canvas.height = vp.height;
            const ctx = canvas.getContext('2d')!;
            await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
            if (!cancelled) setPagePreview(canvas.toDataURL('image/jpeg', 0.8));
        };
        render();
        return () => { cancelled = true; };
    }, [file, pageCount, selectedPage]);

    // Signature canvas
    const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const endDraw = () => {
        if (!isDrawing || !canvasRef.current) return;
        setIsDrawing(false);
        setSignatureData(canvasRef.current.toDataURL('image/png'));
    };

    const clearSignature = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setSignatureData(null);
    };

    // Drag signature position on preview
    const handlePreviewMouseDown = (e: React.MouseEvent) => {
        if (!signatureData || !previewRef.current) return;
        setIsDragging(true);
        updateSigPos(e);
    };

    const handlePreviewMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !previewRef.current) return;
        updateSigPos(e);
    };

    const updateSigPos = (e: React.MouseEvent) => {
        if (!previewRef.current) return;
        const rect = previewRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSigPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    };

    const handleApply = async () => {
        if (!file || !signatureData) return;
        setIsProcessing(true);
        setProgress(20);
        setError(null);
        try {
            // Decode signature image
            const sigResponse = await fetch(signatureData);
            const sigBlob = await sigResponse.blob();
            const sigBytes = new Uint8Array(await sigBlob.arrayBuffer());

            const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
            const sigImage = await pdfDoc.embedPng(sigBytes);
            setProgress(50);

            const page = pdfDoc.getPage(selectedPage - 1);
            const { width, height } = page.getSize();

            // Convert % position to PDF coordinates
            const sigW = sigSize.w * (width / 500); // scale relative to display
            const sigH = sigSize.h * (width / 500);
            const x = (sigPosition.x / 100) * width - sigW / 2;
            const y = height - (sigPosition.y / 100) * height - sigH / 2;

            page.drawImage(sigImage, { x, y, width: sigW, height: sigH });

            const pdfBytes = await pdfDoc.save();
            setProgress(100);
            setResult(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result, `${baseName}_signed.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setPageCount(null);
        setPagePreview(null);
        setSignatureData(null);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="Sign PDF" description="Draw your signature and place it on your document.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {file && pageCount && !result && !isProcessing && (
                <div className="space-y-6">
                    {/* Signature drawing */}
                    <div className="p-6 bg-gray-50 border-4 border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <label className="font-bold text-sm uppercase tracking-wide text-gray-500">Draw Your Signature</label>
                            <button onClick={clearSignature} className="flex items-center gap-1 px-3 py-1 text-sm font-bold uppercase tracking-wide border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors">
                                <Eraser className="w-4 h-4" /> Clear
                            </button>
                        </div>
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={120}
                            className="w-full max-w-md border-4 border-black rounded-lg bg-white cursor-crosshair mx-auto block"
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={endDraw}
                            onMouseLeave={endDraw}
                        />
                    </div>

                    {/* Page selector */}
                    {pageCount > 1 && (
                        <div className="flex items-center gap-3">
                            <label className="font-bold text-sm uppercase tracking-wide text-gray-500">Page:</label>
                            <select
                                value={selectedPage}
                                onChange={(e) => setSelectedPage(Number(e.target.value))}
                                className="px-3 py-2 font-bold border-4 border-black rounded-lg bg-white"
                            >
                                {Array.from({ length: pageCount }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Page preview with signature placement */}
                    {pagePreview && (
                        <div>
                            <p className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">
                                {signatureData ? 'Click to place signature on page' : 'Draw a signature above first'}
                            </p>
                            <div
                                ref={previewRef}
                                className="relative inline-block border-4 border-gray-200 rounded-lg overflow-hidden cursor-crosshair max-w-full"
                                onMouseDown={handlePreviewMouseDown}
                                onMouseMove={handlePreviewMouseMove}
                                onMouseUp={() => setIsDragging(false)}
                                onMouseLeave={() => setIsDragging(false)}
                            >
                                <img src={pagePreview} alt={`Page ${selectedPage}`} className="max-w-full h-auto pointer-events-none" />
                                {signatureData && (
                                    <img
                                        src={signatureData}
                                        alt="Signature"
                                        className="absolute pointer-events-none border-2 border-dashed border-blue-400"
                                        style={{
                                            left: `${sigPosition.x}%`,
                                            top: `${sigPosition.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            width: `${sigSize.w}px`,
                                            height: `${sigSize.h}px`,
                                            objectFit: 'contain',
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-6 border-t-2 border-gray-200">
                        <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                        <button
                            onClick={handleApply}
                            disabled={!signatureData}
                            className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Sign PDF
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Signing PDF..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Try Again</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✍️</div>
                    <h3 className="text-2xl font-black mb-2">PDF Signed!</h3>
                    <p className="text-gray-600 mb-6">Your signature has been added to page {selectedPage}.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
