import { useState, useEffect } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import {
    getPdfPageCount,
    splitPdfByRange,
    splitPdfAllPages,
    validatePageRange,
    downloadBlob,
    downloadAsZip,
    formatBytes,
    type SplitResult,
    type SplitPage as SplitPageType,
} from '../lib/pdf-split';

type SplitMode = 'range' | 'all';

export default function SplitPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [splitMode, setSplitMode] = useState<SplitMode>('range');
    const [rangeInput, setRangeInput] = useState('');
    const [rangeError, setRangeError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<SplitResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingPageCount, setIsLoadingPageCount] = useState(false);

    // When file changes, get page count
    useEffect(() => {
        if (file) {
            setIsLoadingPageCount(true);
            getPdfPageCount(file)
                .then((count) => {
                    setPageCount(count);
                    // Set default range to all pages
                    setRangeInput(`1-${count}`);
                })
                .catch((err) => {
                    setError(err instanceof Error ? err.message : 'Failed to read PDF');
                })
                .finally(() => {
                    setIsLoadingPageCount(false);
                });
        }
    }, [file]);

    // Validate range input when it changes
    useEffect(() => {
        if (rangeInput && pageCount) {
            const validation = validatePageRange(rangeInput, pageCount);
            setRangeError(validation.isValid ? null : validation.error || 'Invalid range');
        } else {
            setRangeError(null);
        }
    }, [rangeInput, pageCount]);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setResult(null);
        setError(null);
        setProgress(0);
        setPageCount(null);
        setRangeInput('');
        setRangeError(null);
    };

    const handleSplit = async () => {
        if (!file || !pageCount) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setResult(null);

        try {
            let splitResult: SplitResult;

            if (splitMode === 'range') {
                splitResult = await splitPdfByRange(file, rangeInput);
            } else {
                splitResult = await splitPdfAllPages(file, setProgress);
            }

            setResult(splitResult);
            setProgress(100);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to split PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadSingle = (page: SplitPageType) => {
        downloadBlob(page.blob, page.fileName);
    };

    const handleDownloadAll = async () => {
        if (!result) return;
        const baseName = file?.name.replace(/\.pdf$/i, '') || 'split';
        await downloadAsZip(result.pages, `${baseName}_split.zip`);
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setProgress(0);
        setPageCount(null);
        setRangeInput('');
        setRangeError(null);
    };

    const handleTryAgain = () => {
        setResult(null);
        setError(null);
        setProgress(0);
    };

    const canSplit = file && pageCount && !rangeError && (splitMode === 'all' || rangeInput.trim());

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold uppercase tracking-widest text-green-600 border-2 border-green-500 rounded-full bg-green-50">
                    Your Files Never Leave Your Device
                </span>
                <h1 className="text-5xl font-black mb-4">Split PDF</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Extract specific pages or split your PDF into individual pages.
                </p>
            </div>

            {/* Main content */}
            <div className="space-y-8">
                {/* File upload */}
                {!result && (
                    <FileDropzone
                        onFileSelect={handleFileSelect}
                        label="Drop your PDF here to split"
                        selectedFile={file}
                    />
                )}

                {/* Page count display */}
                {file && !result && !isProcessing && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-lg">PDF Information</h3>
                            {isLoadingPageCount ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Loading...</span>
                                </div>
                            ) : pageCount ? (
                                <div className="flex items-center gap-3">
                                    <span className="px-4 py-2 bg-black text-white font-black rounded-lg">
                                        {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        {pageCount && (
                            <>
                                {/* Split mode selector */}
                                <div className="mb-6">
                                    <h4 className="font-bold text-sm text-gray-700 mb-3">Split Mode</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setSplitMode('range')}
                                            className={`
                                                p-4 rounded-xl border-2 transition-all duration-200
                                                ${splitMode === 'range'
                                                    ? 'border-black bg-black text-white'
                                                    : 'border-gray-200 hover:border-black'
                                                }
                                            `}
                                        >
                                            <div className="font-black text-lg">Extract Range</div>
                                            <div className={`text-sm ${splitMode === 'range' ? 'text-gray-300' : 'text-gray-500'}`}>
                                                Select specific pages
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setSplitMode('all')}
                                            className={`
                                                p-4 rounded-xl border-2 transition-all duration-200
                                                ${splitMode === 'all'
                                                    ? 'border-black bg-black text-white'
                                                    : 'border-gray-200 hover:border-black'
                                                }
                                            `}
                                        >
                                            <div className="font-black text-lg">Split All</div>
                                            <div className={`text-sm ${splitMode === 'all' ? 'text-gray-300' : 'text-gray-500'}`}>
                                                One file per page
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Page range input */}
                                {splitMode === 'range' && (
                                    <div className="mb-6">
                                        <label className="block font-bold text-sm text-gray-700 mb-2">
                                            Page Range
                                        </label>
                                        <input
                                            type="text"
                                            value={rangeInput}
                                            onChange={(e) => setRangeInput(e.target.value)}
                                            placeholder="e.g., 1-3, 5, 7-10"
                                            className={`
                                                w-full px-4 py-3 border-2 rounded-xl text-lg font-medium
                                                focus:outline-none focus:ring-2 focus:ring-offset-2
                                                transition-all duration-200
                                                ${rangeError
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                                    : 'border-gray-200 focus:border-black focus:ring-black'
                                                }
                                            `}
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            Use commas to separate pages or ranges. Example: 1-3, 5, 7-10
                                        </p>
                                        {rangeError && (
                                            <p className="mt-2 text-sm text-red-600 font-medium">
                                                {rangeError}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {splitMode === 'all' && (
                                    <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                        <p className="text-blue-700">
                                            <span className="font-bold">ℹ️ Info:</span> This will create {pageCount} separate PDF files, one for each page.
                                        </p>
                                    </div>
                                )}

                                {/* Split button */}
                                <button
                                    onClick={handleSplit}
                                    disabled={!canSplit}
                                    className={`
                                        w-full py-4 px-8 font-black text-xl rounded-xl
                                        transition-all duration-200
                                        ${canSplit
                                            ? 'bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    Split PDF
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Progress indicator */}
                {isProcessing && (
                    <div className="bg-gray-50 rounded-2xl p-8">
                        <ProgressIndicator
                            progress={progress}
                            status={splitMode === 'all' ? 'Splitting pages...' : 'Extracting pages...'}
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
                        <h3 className="font-black text-2xl mb-6 text-center">
                            Split Complete! 🎉
                        </h3>

                        {/* Summary */}
                        <div className="text-center mb-8">
                            <div className="inline-block bg-green-100 text-green-700 px-6 py-3 rounded-full font-bold">
                                Created {result.pages.length} {result.pages.length === 1 ? 'file' : 'files'} from {result.totalPages} pages
                            </div>
                        </div>

                        {/* Download all as ZIP (if multiple files) */}
                        {result.pages.length > 1 && (
                            <button
                                onClick={handleDownloadAll}
                                className="
                                    w-full mb-6 py-4 px-8 bg-black text-white font-black text-xl
                                    rounded-xl hover:bg-gray-800 transition-all duration-200
                                    hover:scale-[1.02] active:scale-[0.98]
                                    flex items-center justify-center gap-3
                                "
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download All as ZIP
                            </button>
                        )}

                        {/* Individual page downloads */}
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {result.pages.map((page, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-black transition-all duration-200"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-600">
                                            {page.pageNumbers.length === 1 ? page.pageNumbers[0] : `${page.pageNumbers[0]}-${page.pageNumbers[page.pageNumbers.length - 1]}`}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{page.fileName}</div>
                                            <div className="text-xs text-gray-500">
                                                {formatBytes(page.blob.size)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadSingle(page)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-black hover:text-white font-bold rounded-lg transition-all duration-200"
                                    >
                                        Download
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={handleTryAgain}
                                className="
                                    flex-1 py-4 px-8 border-2 border-black font-black text-xl
                                    rounded-xl hover:bg-gray-100 transition-all duration-200
                                "
                            >
                                Split Again
                            </button>
                            <button
                                onClick={handleReset}
                                className="
                                    flex-1 py-4 px-8 border-2 border-black font-black text-xl
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
