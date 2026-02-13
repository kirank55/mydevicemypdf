import { useState, type DragEvent } from 'react';
import ToolPageTemplate from '../components/ToolPageTemplate';
import ProgressIndicator from '../components/ProgressIndicator';
import { imagesToPdf, downloadBlob, PAGE_SIZES, type PageSizeKey } from '../lib/pdf-images';
import { GripVertical, Trash2, ImagePlus } from 'lucide-react';

export default function JpgToPdfPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState<PageSizeKey>('A4');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const addFiles = (newFiles: FileList | File[]) => {
        const imageFiles = Array.from(newFiles).filter(f =>
            f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/jpg'
        );
        if (imageFiles.length === 0) return;

        setFiles(prev => [...prev, ...imageFiles]);
        setResult(null);

        // Generate previews
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviews(prev => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
        setResult(null);
    };

    const handleDragStart = (index: number) => (e: DragEvent) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (index: number) => (e: DragEvent) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (dropIndex: number) => (e: DragEvent) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }
        const newFiles = [...files];
        const newPreviews = [...previews];
        const [movedFile] = newFiles.splice(draggedIndex, 1);
        const [movedPreview] = newPreviews.splice(draggedIndex, 1);
        newFiles.splice(dropIndex, 0, movedFile);
        newPreviews.splice(dropIndex, 0, movedPreview);
        setFiles(newFiles);
        setPreviews(newPreviews);
        setDraggedIndex(null);
        setDragOverIndex(null);
        setResult(null);
    };

    const handleConvert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress(0);
        setError(null);
        try {
            const blob = await imagesToPdf(files, pageSize, setProgress);
            setResult(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to convert images');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;
        downloadBlob(result, 'images_to_pdf.pdf');
    };

    const handleReset = () => {
        setFiles([]);
        setPreviews([]);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="JPG to PDF" description="Convert your images to a PDF document.">
            {/* File input area */}
            {!result && !isProcessing && (
                <>
                    <div
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                        }}
                        className="border-4 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => document.getElementById('jpg-input')?.click()}
                    >
                        <ImagePlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-bold text-gray-600 mb-2">Drop images here or click to browse</p>
                        <p className="text-gray-400 text-sm">Supports JPG, JPEG, PNG</p>
                        <input
                            id="jpg-input"
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && addFiles(e.target.files)}
                        />
                    </div>

                    {/* Image list with drag and drop */}
                    {files.length > 0 && (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-6">
                                {files.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        draggable
                                        onDragStart={handleDragStart(index)}
                                        onDragOver={handleDragOver(index)}
                                        onDrop={handleDrop(index)}
                                        onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                                        className={`relative group rounded-lg overflow-hidden border-4 cursor-grab active:cursor-grabbing transition-all ${dragOverIndex === index ? 'border-blue-500 scale-105' : draggedIndex === index ? 'opacity-50 border-gray-300' : 'border-gray-200 hover:border-gray-400'
                                            }`}
                                    >
                                        {previews[index] ? (
                                            <img src={previews[index]} alt={file.name} className="w-full aspect-3/4 object-cover pointer-events-none" />
                                        ) : (
                                            <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center">
                                                <span className="text-gray-400 text-xs">Loading...</span>
                                            </div>
                                        )}
                                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-opacity hover:bg-red-600"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                        <span className="absolute bottom-0 inset-x-0 text-center text-xs font-bold py-1 bg-black/70 text-white truncate px-1">
                                            {index + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Options */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t-2 border-gray-200">
                                <div className="flex items-center gap-3">
                                    <label className="font-bold text-sm uppercase tracking-wide text-gray-600">Page Size:</label>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(e.target.value as PageSizeKey)}
                                        className="px-3 py-2 font-bold border-4 border-black rounded-lg bg-white"
                                    >
                                        {Object.keys(PAGE_SIZES).map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                    <span className="text-gray-500 text-sm">{files.length} image{files.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Clear All</button>
                                    <button onClick={handleConvert} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">
                                        Convert to PDF
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Converting images..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={() => setError(null)} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Dismiss</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">PDF Created!</h3>
                    <p className="text-gray-600 mb-6">{files.length} image{files.length !== 1 ? 's' : ''} converted to PDF.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Convert More</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
