import { useState } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { addPageNumbers, downloadBlob, type NumberPosition, type NumberFormat } from '../lib/pdf-annotations';

const POSITIONS: { value: NumberPosition; label: string }[] = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-right', label: 'Bottom Right' },
];

const FORMATS: { value: NumberFormat; label: string; example: string }[] = [
    { value: 'numeric', label: '1, 2, 3...', example: '1' },
    { value: 'roman', label: 'i, ii, iii...', example: 'i' },
    { value: 'page-of', label: 'Page 1 of N', example: 'Page 1 of 10' },
];

export default function AddPageNumbersPage() {
    const [file, setFile] = useState<File | null>(null);
    const [position, setPosition] = useState<NumberPosition>('bottom-center');
    const [format, setFormat] = useState<NumberFormat>('numeric');
    const [fontSize, setFontSize] = useState(12);
    const [startFrom, setStartFrom] = useState(1);
    const [margin, setMargin] = useState(30);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleApply = async () => {
        if (!file) return;
        setIsProcessing(true);
        setProgress(20);
        setError(null);
        try {
            setProgress(50);
            const blob = await addPageNumbers(file, { position, format, fontSize, startFrom, margin });
            setProgress(100);
            setResult(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add page numbers');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result, `${baseName}_numbered.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="Add Page Numbers" description="Add numbering to your PDF pages.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {file && !result && !isProcessing && (
                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 border-4 border-gray-200 rounded-lg space-y-6">
                        <p className="font-bold text-gray-600">{file.name}</p>

                        {/* Position picker — visual grid */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Position</label>
                            <div className="grid grid-cols-3 gap-2 max-w-xs">
                                {POSITIONS.map(pos => (
                                    <button
                                        key={pos.value}
                                        onClick={() => setPosition(pos.value)}
                                        className={`px-3 py-2 text-xs font-bold uppercase rounded-lg border-4 transition-all ${position === pos.value ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {pos.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Format */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Format</label>
                            <div className="flex flex-wrap gap-2">
                                {FORMATS.map(f => (
                                    <button
                                        key={f.value}
                                        onClick={() => setFormat(f.value)}
                                        className={`px-4 py-2 text-sm font-bold rounded-lg border-4 transition-all ${format === f.value ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font size, start from, margin */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Font Size</label>
                                <input
                                    type="number"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Math.max(6, Math.min(48, parseInt(e.target.value) || 12)))}
                                    className="w-full px-3 py-2 font-bold border-4 border-black rounded-lg"
                                    min="6" max="48"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Start From</label>
                                <input
                                    type="number"
                                    value={startFrom}
                                    onChange={(e) => setStartFrom(Math.max(0, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-2 font-bold border-4 border-black rounded-lg"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Margin (pt)</label>
                                <input
                                    type="number"
                                    value={margin}
                                    onChange={(e) => setMargin(Math.max(5, Math.min(100, parseInt(e.target.value) || 30)))}
                                    className="w-full px-3 py-2 font-bold border-4 border-black rounded-lg"
                                    min="5" max="100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                        <button onClick={handleApply} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">
                            Add Page Numbers
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Adding page numbers..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Try Again</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">Page Numbers Added!</h3>
                    <p className="text-gray-600 mb-6">Numbers added at {position.replace('-', ' ')} position.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
