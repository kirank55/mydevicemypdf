import { useEffect, useMemo, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import {
    downloadAsZip,
    downloadBlob,
    extractPages,
    formatBytes,
    getPdfPageCount,
    parsePageRange,
    splitPdfAllPages,
    splitPdfByRange,
    type SplitPage as SplitPageType,
    type SplitResult,
    validatePageRange,
} from '../lib/pdf-split';

type SplitMode = 'all' | 'selected';
type PanelTab = 'range' | 'pages' | 'size';

GlobalWorkerOptions.workerSrc = pdfWorker;

const PANEL_TABS: Array<{ key: PanelTab; label: string }> = [
    { key: 'range', label: 'Range' },
    { key: 'pages', label: 'Pages' },
    { key: 'size', label: 'Size' },
];

function formatPageRanges(pageNumbers: number[]): string {
    if (pageNumbers.length === 0) return '';

    const ranges: string[] = [];
    let start = pageNumbers[0];
    let end = pageNumbers[0];

    for (let i = 1; i < pageNumbers.length; i += 1) {
        if (pageNumbers[i] === end + 1) {
            end = pageNumbers[i];
            continue;
        }

        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = pageNumbers[i];
        end = pageNumbers[i];
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(',');
}

function renderTabIcon(tab: PanelTab, active: boolean) {
    const color = active ? '#2a2d38' : '#a0a5b3';

    if (tab === 'range') {
        return (
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <rect x="2" y="5" width="8" height="16" rx="1.5" stroke={color} strokeWidth="1.8" strokeDasharray="2 2" />
                <rect x="16" y="5" width="8" height="16" rx="1.5" stroke={color} strokeWidth="1.8" strokeDasharray="2 2" />
                <line x1="10" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.8" />
            </svg>
        );
    }

    if (tab === 'size') {
        return (
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <rect x="3" y="11" width="9" height="12" rx="1.5" stroke={color} strokeWidth="1.8" />
                <rect x="14" y="3" width="9" height="12" rx="1.5" stroke={color} strokeWidth="1.8" />
                <rect x="15" y="16" width="6" height="7" rx="1.4" stroke={color} strokeWidth="1.8" />
            </svg>
        );
    }

    return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect x="3" y="8" width="9" height="12" rx="1.8" stroke={color} strokeWidth="1.8" />
            <rect x="16" y="3" width="7" height="7" rx="1.4" stroke={color} strokeWidth="1.8" />
            <rect x="16" y="11" width="7" height="7" rx="1.4" stroke={color} strokeWidth="1.8" />
            <rect x="16" y="19" width="7" height="4" rx="1.2" stroke={color} strokeWidth="1.8" />
            <line x1="12" y1="13.5" x2="16" y2="13.5" stroke={color} strokeWidth="1.8" />
        </svg>
    );
}

export default function SplitPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [splitMode, setSplitMode] = useState<SplitMode>('selected');
    const [mergeSelectedPages, setMergeSelectedPages] = useState(true);
    const [rangeInput, setRangeInput] = useState('');
    const [rangeError, setRangeError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<SplitResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingPageCount, setIsLoadingPageCount] = useState(false);
    const [thumbnailByPage, setThumbnailByPage] = useState<Record<number, string>>({});
    const [thumbnailErrorPages, setThumbnailErrorPages] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!file) return;

        setIsLoadingPageCount(true);
        getPdfPageCount(file)
            .then((count) => {
                setPageCount(count);
                setRangeInput(`1-${count}`);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to read PDF');
            })
            .finally(() => {
                setIsLoadingPageCount(false);
            });
    }, [file]);

    useEffect(() => {
        if (!pageCount || splitMode === 'all') {
            setRangeError(null);
            return;
        }

        if (!rangeInput.trim()) {
            setRangeError('No pages specified');
            return;
        }

        const validation = validatePageRange(rangeInput, pageCount);
        setRangeError(validation.isValid ? null : validation.error || 'Invalid range');
    }, [rangeInput, pageCount, splitMode]);

    const selectedPages = useMemo(() => {
        if (!pageCount) return [];
        if (splitMode === 'all') {
            return Array.from({ length: pageCount }, (_, index) => index + 1);
        }

        if (!rangeInput.trim()) return [];
        const validation = validatePageRange(rangeInput, pageCount);
        if (!validation.isValid) return [];

        try {
            return parsePageRange(rangeInput, pageCount);
        } catch {
            return [];
        }
    }, [rangeInput, pageCount, splitMode]);

    const selectedSet = useMemo(() => new Set(selectedPages), [selectedPages]);

    const previewPages = useMemo(() => {
        if (!pageCount) return [];
        const maxPreview = Math.min(pageCount, 12);
        return Array.from({ length: maxPreview }, (_, index) => index + 1);
    }, [pageCount]);

    useEffect(() => {
        if (!file || previewPages.length === 0) {
            setThumbnailByPage({});
            setThumbnailErrorPages(new Set());
            return;
        }

        let isCancelled = false;
        const renderThumbnails = async () => {
            try {
                const fileBytes = new Uint8Array(await file.arrayBuffer());
                const loadingTask = getDocument({ data: fileBytes });
                const pdfDocument = await loadingTask.promise;

                for (const pageNumber of previewPages) {
                    if (isCancelled) {
                        break;
                    }

                    const page = await pdfDocument.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const targetHeight = 112;
                    const scale = targetHeight / baseViewport.height;
                    const viewport = page.getViewport({ scale });
                    const dpr = window.devicePixelRatio || 1;

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
                    canvas.height = Math.max(1, Math.floor(viewport.height * dpr));

                    const context = canvas.getContext('2d');
                    if (!context) {
                        if (!isCancelled) {
                            setThumbnailErrorPages((previous) => {
                                const next = new Set(previous);
                                next.add(pageNumber);
                                return next;
                            });
                        }
                        continue;
                    }

                    context.setTransform(dpr, 0, 0, dpr, 0, 0);

                    await page.render({
                        canvas,
                        canvasContext: context,
                        viewport,
                    }).promise;

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    if (!isCancelled) {
                        setThumbnailByPage((previous) => ({
                            ...previous,
                            [pageNumber]: dataUrl,
                        }));
                        setThumbnailErrorPages((previous) => {
                            if (!previous.has(pageNumber)) {
                                return previous;
                            }
                            const next = new Set(previous);
                            next.delete(pageNumber);
                            return next;
                        });
                    }
                }
            } catch {
                if (!isCancelled) {
                    setThumbnailErrorPages(new Set(previewPages));
                }
            }
        };

        setThumbnailByPage({});
        setThumbnailErrorPages(new Set());
        void renderThumbnails();

        return () => {
            isCancelled = true;
        };
    }, [file, previewPages]);

    const outputCount = splitMode === 'all' ? pageCount ?? 0 : selectedPages.length;

    const canSplit = Boolean(
        file
        && pageCount
        && !isLoadingPageCount
        && (splitMode === 'all' || (!rangeError && selectedPages.length > 0)),
    );

    const infoText = splitMode === 'selected'
        ? mergeSelectedPages
            ? 'Selected pages will be merged into one PDF file.'
            : `Selected pages will be converted into separate PDF files. ${outputCount} PDF ${outputCount === 1 ? 'file' : 'files'} will be created.`
        : `All pages will be converted into separate PDF files. ${outputCount} PDF ${outputCount === 1 ? 'file' : 'files'} will be created.`;

    const panelRangeValue = splitMode === 'all' && pageCount ? `1-${pageCount}` : rangeInput;

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setResult(null);
        setError(null);
        setProgress(0);
        setPageCount(null);
        setThumbnailByPage({});
        setThumbnailErrorPages(new Set());
        setRangeInput('');
        setRangeError(null);
        setSplitMode('selected');
        setMergeSelectedPages(true);
    };

    const handleSplit = async () => {
        if (!file || !pageCount) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setResult(null);

        try {
            let splitResult: SplitResult;

            if (splitMode === 'all') {
                splitResult = await splitPdfAllPages(file, setProgress);
            } else {
                const pageNumbers = parsePageRange(rangeInput, pageCount);

                if (mergeSelectedPages) {
                    splitResult = await splitPdfByRange(file, formatPageRanges(pageNumbers));
                } else {
                    const baseName = file.name.replace(/\.pdf$/i, '');
                    const splitPages: SplitPageType[] = [];

                    for (let i = 0; i < pageNumbers.length; i += 1) {
                        const pageNumber = pageNumbers[i];
                        const blob = await extractPages(file, [pageNumber]);

                        splitPages.push({
                            pageNumbers: [pageNumber],
                            blob,
                            fileName: `${baseName}_page_${pageNumber}.pdf`,
                        });

                        setProgress(Math.round(((i + 1) / pageNumbers.length) * 100));
                    }

                    splitResult = {
                        pages: splitPages,
                        totalPages: pageCount,
                        originalName: file.name,
                    };
                }
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
        setThumbnailByPage({});
        setThumbnailErrorPages(new Set());
        setRangeInput('');
        setRangeError(null);
        setSplitMode('selected');
        setMergeSelectedPages(true);
    };

    const handleTryAgain = () => {
        setResult(null);
        setError(null);
        setProgress(0);
    };

    const handlePageToggle = (pageNumber: number) => {
        if (splitMode !== 'selected') return;

        const pageSet = new Set(selectedPages);
        if (pageSet.has(pageNumber)) {
            pageSet.delete(pageNumber);
        } else {
            pageSet.add(pageNumber);
        }

        const updated = Array.from(pageSet).sort((a, b) => a - b);
        setRangeInput(formatPageRanges(updated));
    };

    return (
        <div className="mx-auto w-full max-w-375 px-4 py-10">
            <div className="mb-8 text-center">
                <h1 className="mb-3 text-5xl font-black">Split</h1>
                <p className="mx-auto max-w-3xl text-lg text-gray-600">
                    Extract specific pages or split every page into separate PDF files.
                </p>
            </div>

            <div className="space-y-8">
                {!file && !result && (
                    <FileDropzone
                        onFileSelect={handleFileSelect}
                        label="Drop your PDF here to split"
                        selectedFile={file}
                    />
                )}

                {file && !result && !isProcessing && (
                    <div className="overflow-hidden rounded-2xl border border-[#d4d8e5] bg-[#f3f4fa] shadow-sm">
                        {isLoadingPageCount || !pageCount ? (
                            <div className="flex min-h-90 items-center justify-center">
                                <div className="flex items-center gap-3 text-[#60677a]">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                                    </svg>
                                    <span className="font-semibold">Loading PDF pages...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="grid xl:grid-cols-[1fr_430px]">
                                <div className="border-b border-[#d4d8e5] p-6 xl:border-b-0 xl:border-r xl:p-8">
                                    <div className="mb-6 flex flex-wrap items-center gap-3">
                                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#4d5568]">
                                            {file.name}
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#4d5568]">
                                            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="ml-auto rounded-lg border border-[#d1d5e2] bg-white px-3 py-1.5 text-sm font-semibold text-[#4d5568] transition-colors hover:border-[#9299ab]"
                                        >
                                            Change file
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                                        {previewPages.map((pageNumber) => {
                                            const isSelected = selectedSet.has(pageNumber);
                                            const thumbnail = thumbnailByPage[pageNumber];
                                            const hasThumbnailError = thumbnailErrorPages.has(pageNumber);

                                            return (
                                                <button
                                                    key={pageNumber}
                                                    type="button"
                                                    onClick={() => handlePageToggle(pageNumber)}
                                                    className={`relative rounded-xl border p-3 text-left shadow-sm transition ${splitMode === 'selected' ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'} ${isSelected ? 'border-[#53ca88] bg-white' : 'border-[#d8dbe8] bg-white'}`}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#49c77f] text-white shadow-sm">
                                                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                                                <path d="M16 6L8.5 13.5L4 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    )}

                                                    <div className="mb-3 h-28 overflow-hidden rounded-sm border border-[#e0e3ec] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                                                        <div className="h-full w-full bg-[#f3f4f8]">
                                                            {thumbnail ? (
                                                                <img
                                                                    src={thumbnail}
                                                                    alt={`Preview of page ${pageNumber}`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : hasThumbnailError ? (
                                                                <div className="flex h-full items-center justify-center text-sm font-semibold text-[#9098ac]">
                                                                    Preview unavailable
                                                                </div>
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-sm font-semibold text-[#9098ac]">
                                                                    Rendering...
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-center text-xl font-medium text-[#44506a]">{pageNumber}</div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {pageCount > previewPages.length && (
                                        <p className="mt-4 text-sm text-[#6b7285]">
                                            Showing first {previewPages.length} pages in preview.
                                        </p>
                                    )}
                                </div>

                                <aside className="bg-white">
                                    <div className="border-b border-[#d4d8e5] px-8 py-5">
                                        <h2 className="text-center text-5xl font-black tracking-tight text-[#2b2f3d]">Split</h2>
                                    </div>

                                    <div className="grid grid-cols-3 border-b border-[#d4d8e5]">
                                        {PANEL_TABS.map((tab) => {
                                            const isActive = tab.key === 'pages';
                                            return (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    disabled={!isActive}
                                                    className={`flex flex-col items-center justify-center border-r border-[#d4d8e5] px-3 py-5 text-lg last:border-r-0 ${isActive ? 'text-[#202432]' : 'text-[#9ea4b2]'}`}
                                                >
                                                    {renderTabIcon(tab.key, isActive)}
                                                    <span className={`mt-2 text-lg ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-6 px-7 py-8">
                                        <div>
                                            <p className="mb-3 text-2xl font-semibold text-[#343947]">Extract mode:</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSplitMode('all')}
                                                    className={`rounded-xl border px-4 py-4 text-xl font-medium transition ${splitMode === 'all' ? 'border-[#ef4444] bg-white text-[#ef4444]' : 'border-transparent bg-[#eef0f5] text-[#83899a] hover:text-[#565d72]'}`}
                                                >
                                                    Extract all pages
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSplitMode('selected')}
                                                    className={`rounded-xl border px-4 py-4 text-xl font-medium transition ${splitMode === 'selected' ? 'border-[#ef4444] bg-white text-[#ef4444]' : 'border-transparent bg-[#eef0f5] text-[#83899a] hover:text-[#565d72]'}`}
                                                >
                                                    Select pages
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-2xl font-semibold text-[#343947]">Pages to extract:</label>
                                            <input
                                                type="text"
                                                value={panelRangeValue}
                                                onChange={(event) => setRangeInput(event.target.value)}
                                                disabled={splitMode === 'all'}
                                                placeholder="1-2,4-6"
                                                className={`w-full rounded-lg border px-4 py-3 text-lg font-medium outline-none transition sm:text-xl ${rangeError ? 'border-[#f48b8b] text-[#d43838] focus:border-[#ef4444]' : 'border-[#aeb4c4] text-[#323847] focus:border-[#5f6f90]'} ${splitMode === 'all' ? 'cursor-not-allowed bg-[#f3f4f7] text-[#9aa1b1]' : 'bg-white'}`}
                                            />
                                            {rangeError && splitMode === 'selected' && (
                                                <p className="mt-2 text-sm font-medium text-[#d43737]">{rangeError}</p>
                                            )}
                                        </div>

                                        <label className={`flex items-start gap-3 text-xl text-[#404756] ${splitMode !== 'selected' ? 'opacity-50' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={mergeSelectedPages}
                                                onChange={(event) => setMergeSelectedPages(!event.target.checked)}
                                                disabled={splitMode !== 'selected'}
                                                className="mt-1 h-7 w-7 rounded border border-[#9da4b7] accent-[#ef4444]"
                                            />
                                            <span>Merge extracted pages into one PDF file.</span>
                                        </label>

                                        <div className="rounded-lg border border-[#cce6fb] bg-[#e9f6ff] px-4 py-5 text-lg text-[#1f3f5d]">
                                            {infoText}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSplit}
                                            disabled={!canSplit}
                                            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-5 text-2xl font-bold text-white transition sm:text-3xl ${canSplit ? 'bg-[#ef2f2f] hover:bg-[#df2525]' : 'cursor-not-allowed bg-[#f1a0a0]'}`}
                                        >
                                            <span>Split PDF</span>
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                                <path d="M10 8L14 12L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                )}

                {isProcessing && (
                    <div className="rounded-2xl bg-gray-50 p-8">
                        <ProgressIndicator
                            progress={progress}
                            status={splitMode === 'all' ? 'Splitting pages...' : 'Extracting pages...'}
                        />
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                        <div className="mb-2 text-lg font-black text-red-700">Error</div>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={handleReset}
                            className="mt-4 rounded-lg bg-red-600 px-6 py-2 font-bold text-white hover:bg-red-700"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {result && (
                    <div className="rounded-2xl bg-gray-50 p-8">
                        <h3 className="mb-6 text-center text-2xl font-black">Split Complete</h3>

                        <div className="mb-8 text-center">
                            <div className="inline-block rounded-full bg-green-100 px-6 py-3 font-bold text-green-700">
                                Created {result.pages.length} {result.pages.length === 1 ? 'file' : 'files'} from {result.totalPages} pages
                            </div>
                        </div>

                        {result.pages.length > 1 && (
                            <button
                                onClick={handleDownloadAll}
                                className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl bg-black px-8 py-4 text-xl font-black text-white transition-all duration-200 hover:scale-[1.02] hover:bg-gray-800 active:scale-[0.98]"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
                                </svg>
                                Download All as ZIP
                            </button>
                        )}

                        <div className="max-h-80 space-y-3 overflow-y-auto">
                            {result.pages.map((page, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-200 hover:border-black"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 font-black text-gray-600">
                                            {page.pageNumbers.length === 1 ? page.pageNumbers[0] : `${page.pageNumbers[0]}-${page.pageNumbers[page.pageNumbers.length - 1]}`}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">{page.fileName}</div>
                                            <div className="text-xs text-gray-500">{formatBytes(page.blob.size)}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadSingle(page)}
                                        className="rounded-lg bg-gray-100 px-4 py-2 font-bold transition-all duration-200 hover:bg-black hover:text-white"
                                    >
                                        Download
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={handleTryAgain}
                                className="flex-1 rounded-xl border-2 border-black px-8 py-4 text-xl font-black transition-all duration-200 hover:bg-gray-100"
                            >
                                Try Split Again
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 rounded-xl border-2 border-black px-8 py-4 text-xl font-black transition-all duration-200 hover:bg-gray-100"
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
