
import { useState } from 'react';
import MultiFileDropzone from '../components/MultiFileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import { mergePdfs, downloadBlob, formatBytes } from '../lib/pdf-merge';

export default function MergePage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFilesSelect = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setResult(null);
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        setFiles(prev => {
            const newFiles = [...prev];
            [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
            return newFiles;
        });
        setResult(null);
    };

    const moveDown = (index: number) => {
        if (index === files.length - 1) return;
        setFiles(prev => {
            const newFiles = [...prev];
            [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
            return newFiles;
        });
        setResult(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setResult(null);

        try {
            const mergedBlob = await mergePdfs(files, setProgress);
            setResult({
                blob: mergedBlob,
                size: mergedBlob.size
            });
            setProgress(100);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to merge PDFs');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;
        downloadBlob(result.blob, 'merged.pdf');
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold uppercase tracking-widest text-green-600 border-2 border-green-500 rounded-full bg-green-50">
                    Your Files Never Leave Your Device
                </span>
                <h1 className="text-5xl font-black mb-4">Merge PDFs</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Combine multiple PDF files into one.
                </p>
            </div>

            <div className="space-y-8">
                {/* File Upload Area */}
                {!result && !isProcessing && (
                    <MultiFileDropzone
                        onFilesSelect={handleFilesSelect}
                        label="Drop PDFs to merge"
                    />
                )}

                {/* File List */}
                {files.length > 0 && !result && !isProcessing && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-lg">Files to Merge ({files.length})</h3>
                            <button onClick={handleReset} className="text-sm font-bold text-red-600 hover:text-red-700">
                                Clear All
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {files.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-gray-100">
                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-xs font-bold text-gray-500">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate">{file.name}</div>
                                        <div className="text-xs text-gray-500">{formatBytes(file.size)}</div>
                                    </div>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => moveUp(index)}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-white rounded disabled:opacity-30 transition-colors"
                                            title="Move Up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => moveDown(index)}
                                            disabled={index === files.length - 1}
                                            className="p-1 hover:bg-white rounded disabled:opacity-30 transition-colors"
                                            title="Move Down"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Merge Button */}
                        <button
                            onClick={handleMerge}
                            disabled={files.length < 2}
                            className={`
                                w-full mt-6 py-4 px-8 font-black text-xl rounded-xl
                                transition-all duration-200
                                ${files.length >= 2
                                    ? 'bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }
                            `}
                        >
                            {files.length < 2 ? 'Select at least 2 files' : 'Merge PDFs'}
                        </button>
                    </div>
                )}

                {/* Progress */}
                {isProcessing && (
                    <div className="bg-gray-50 rounded-2xl p-8">
                        <ProgressIndicator progress={progress} status="Merging PDFs..." />
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="font-black text-2xl mb-2">Merge Complete!</h3>
                        <p className="text-gray-600 mb-8">
                            Your merged PDF is ready ({formatBytes(result.size)})
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handleDownload}
                                className="py-4 px-8 bg-black text-white font-black text-xl
                                    rounded-xl hover:bg-gray-800 transition-all duration-200
                                    hover:scale-[1.02] active:scale-[0.98]
                                    flex items-center gap-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Merged PDF
                            </button>
                            <button
                                onClick={handleReset}
                                className="py-4 px-8 border-2 border-black font-black text-xl
                                    rounded-xl hover:bg-gray-100 transition-all duration-200"
                            >
                                Try Another
                            </button>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
                        <div className="font-black text-red-700 text-lg mb-2">Error</div>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-4 px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
