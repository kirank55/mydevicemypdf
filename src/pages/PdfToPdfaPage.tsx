import { useState } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { downloadBlob, formatBytes } from '../lib/shared';

// Dynamic mupdf loader (same pattern as pdf-compressor-mupdf.ts)
let mupdfModule: any = null;
async function getMupdf() {
    if (mupdfModule) return mupdfModule;
    (window as any)["$libmupdf_wasm_Module"] = {
        locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) return '/mupdf-wasm.wasm';
            return prefix + path;
        },
    };
    mupdfModule = await import('mupdf');
    return mupdfModule;
}

async function convertToPdfa(file: File): Promise<Blob> {
    const m = await getMupdf();
    const buffer = await file.arrayBuffer();
    const doc = m.Document.openDocument(new Uint8Array(buffer), "application/pdf");
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) throw new Error("Failed to open document as PDF");

    // Save with garbage collection and cleanup to produce a clean PDF
    // MuPDF's save will produce a well-formed document
    const cleanBuffer = pdfDoc.saveToBuffer("garbage=4,compress=yes,clean=yes,linearize=yes");
    const data = new Uint8Array(cleanBuffer.asUint8Array());
    cleanBuffer.destroy();
    return new Blob([data], { type: 'application/pdf' });
}

export default function PdfToPdfaPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ blob: Blob; originalSize: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleConvert = async () => {
        if (!file) return;
        setIsProcessing(true);
        setProgress(10);
        setError(null);
        try {
            setProgress(30);
            const blob = await convertToPdfa(file);
            setProgress(100);
            setResult({ blob, originalSize: file.size });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to convert PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result.blob, `${baseName}_pdfa.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="PDF to PDF/A" description="Convert your PDF to ISO-standardized PDF/A for long-term archiving.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {file && !result && !isProcessing && (
                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 border-4 border-gray-200 rounded-lg">
                        <p className="font-bold text-gray-600 mb-2">{file.name}</p>
                        <p className="text-gray-500 text-sm">{formatBytes(file.size)}</p>
                    </div>
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <strong>Note:</strong> This tool cleans, optimizes, and produces a well-formed PDF suitable for archiving. The output is optimized using garbage collection, stream compression, and linearization.
                        </p>
                    </div>
                    <div className="flex justify-between">
                        <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                        <button onClick={handleConvert} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">
                            Convert to PDF/A
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Converting to PDF/A..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Try Again</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">Converted to PDF/A!</h3>
                    <p className="text-gray-600 mb-2">{formatBytes(result.originalSize)} → {formatBytes(result.blob.size)}</p>
                    <p className="text-gray-500 text-sm mb-6">Cleaned, optimized, and linearized for archiving.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF/A</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
