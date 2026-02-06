import { useState } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import { compressPDF, downloadBlob, formatBytes, getCompressionPercent, type CompressionResult } from '../lib/pdf-utils';

type Quality = 'low' | 'medium' | 'high';

export default function CompressPage() {
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState<Quality>('medium');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<CompressionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setResult(null);

        try {
            const compressionResult = await compressPDF(file, {
                quality,
                onProgress: setProgress,
            });
            setResult(compressionResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to compress PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (result) {
            downloadBlob(result.blob, result.fileName);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-5xl font-black mb-4">Compress PDF</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Reduce your PDF file size while maintaining quality.
                    <span className="font-bold text-black"> 100% in your browser</span> — your files never leave your device.
                </p>
            </div>

            {/* Main content */}
            <div className="space-y-8">
                {/* File upload */}
                {!result && (
                    <FileDropzone
                        onFileSelect={handleFileSelect}
                        label="Drop your PDF here to compress"
                    />
                )}

                {/* Quality selector */}
                {file && !result && !isProcessing && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                        <h3 className="font-black text-lg mb-4">Compression Quality</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {(['low', 'medium', 'high'] as Quality[]).map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`
                    p-4 rounded-xl border-2 transition-all duration-200
                    ${quality === q
                                            ? 'border-black bg-black text-white'
                                            : 'border-gray-200 hover:border-black'
                                        }
                  `}
                                >
                                    <div className="font-black text-lg capitalize">{q}</div>
                                    <div className={`text-sm ${quality === q ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {q === 'low' && 'Maximum compression'}
                                        {q === 'medium' && 'Balanced'}
                                        {q === 'high' && 'Best quality'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Compress button */}
                        <button
                            onClick={handleCompress}
                            className="
                w-full mt-6 py-4 px-8 bg-black text-white font-black text-xl
                rounded-xl hover:bg-gray-800 transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98]
              "
                        >
                            Compress PDF
                        </button>
                    </div>
                )}

                {/* Progress indicator */}
                {isProcessing && (
                    <div className="bg-gray-50 rounded-2xl p-8">
                        <ProgressIndicator
                            progress={progress}
                            status="Compressing your PDF..."
                        />
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
                        <div className="font-black text-red-700 text-lg mb-2">Error</div>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={handleReset}
                            className="mt-4 px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="bg-gray-50 rounded-2xl p-8">
                        <h3 className="font-black text-2xl mb-6 text-center">Compression Complete!</h3>

                        {/* Size comparison */}
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
                                <div className="text-gray-500 font-medium mb-2">Original Size</div>
                                <div className="text-3xl font-black">{formatBytes(result.originalSize)}</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 text-center border-2 border-black">
                                <div className="text-gray-500 font-medium mb-2">Compressed Size</div>
                                <div className="text-3xl font-black">{formatBytes(result.compressedSize)}</div>
                            </div>
                        </div>

                        {/* Compression percentage */}
                        <div className="text-center mb-8">
                            {result.compressedSize < result.originalSize ? (
                                <div className="inline-block bg-green-100 text-green-700 px-6 py-3 rounded-full font-black text-xl">
                                    🎉 {getCompressionPercent(result.originalSize, result.compressedSize)}% smaller!
                                </div>
                            ) : (
                                <div className="inline-block bg-yellow-100 text-yellow-700 px-6 py-3 rounded-full font-bold">
                                    ℹ️ This PDF is already well-optimized
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleDownload}
                                className="flex-1 py-4 px-8 bg-black text-white font-black text-xl
                  rounded-xl hover:bg-gray-800 transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                "
                            >
                                Download Compressed PDF
                            </button>
                            <button
                                onClick={handleReset}
                                className="
                  py-4 px-8 border-2 border-black font-black text-xl
                  rounded-xl hover:bg-gray-100 transition-all duration-200
                "
                            >
                                New File
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
