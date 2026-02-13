import { useState } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { addWatermark, downloadBlob } from '../lib/pdf-annotations';

const COLOR_PRESETS = [
    { label: 'Gray', r: 0.5, g: 0.5, b: 0.5 },
    { label: 'Red', r: 0.8, g: 0.1, b: 0.1 },
    { label: 'Blue', r: 0.1, g: 0.1, b: 0.8 },
    { label: 'Green', r: 0.1, g: 0.6, b: 0.1 },
    { label: 'Black', r: 0, g: 0, b: 0 },
];

export default function AddWatermarkPage() {
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState('CONFIDENTIAL');
    const [fontSize, setFontSize] = useState(48);
    const [opacity, setOpacity] = useState(0.15);
    const [rotation, setRotation] = useState(-30);
    const [colorIndex, setColorIndex] = useState(0);
    const [position, setPosition] = useState<'center' | 'tiled'>('tiled');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleApply = async () => {
        if (!file || !text.trim()) return;
        setIsProcessing(true);
        setProgress(20);
        setError(null);
        try {
            setProgress(50);
            const color = COLOR_PRESETS[colorIndex];
            const blob = await addWatermark(file, {
                text: text.trim(),
                fontSize,
                opacity,
                rotation,
                color: { r: color.r, g: color.g, b: color.b },
                position,
            });
            setProgress(100);
            setResult(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add watermark');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result, `${baseName}_watermarked.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="Add Watermark" description="Stamp text over your PDF pages.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {file && !result && !isProcessing && (
                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 border-4 border-gray-200 rounded-lg space-y-6">
                        <p className="font-bold text-gray-600">{file.name}</p>

                        {/* Text */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Watermark Text</label>
                            <input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full px-4 py-3 font-bold text-lg border-4 border-black rounded-lg"
                                placeholder="Enter watermark text"
                            />
                        </div>

                        {/* Position */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Style</label>
                            <div className="flex gap-2">
                                {(['tiled', 'center'] as const).map(p => (
                                    <button key={p} onClick={() => setPosition(p)} className={`flex-1 px-4 py-2 font-bold uppercase text-sm rounded-lg border-4 transition-all ${position === p ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                                        {p === 'tiled' ? 'Tiled (Repeating)' : 'Single Center'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Color</label>
                            <div className="flex gap-2">
                                {COLOR_PRESETS.map((c, i) => (
                                    <button
                                        key={c.label}
                                        onClick={() => setColorIndex(i)}
                                        className={`w-10 h-10 rounded-full border-4 transition-all ${colorIndex === i ? 'border-black scale-110' : 'border-gray-300 hover:border-gray-400'}`}
                                        style={{ backgroundColor: `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})` }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Font Size: {fontSize}</label>
                                <input type="range" min="12" max="120" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-black" />
                            </div>
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Opacity: {Math.round(opacity * 100)}%</label>
                                <input type="range" min="0.01" max="0.5" step="0.01" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-black" />
                            </div>
                            <div>
                                <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Rotation: {rotation}°</label>
                                <input type="range" min="-90" max="90" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full accent-black" />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="relative w-full aspect-3/4 max-w-xs mx-auto bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                            <div
                                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                                style={{ opacity }}
                            >
                                {position === 'tiled' ? (
                                    <div className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}>
                                        {Array.from({ length: 5 }, (_, row) => (
                                            <div key={row} className="flex gap-8 whitespace-nowrap" style={{ marginTop: row === 0 ? '-20%' : '40px' }}>
                                                {Array.from({ length: 3 }, (_, col) => (
                                                    <span key={col} className="font-bold" style={{ fontSize: fontSize * 0.3, color: `rgb(${COLOR_PRESETS[colorIndex].r * 255}, ${COLOR_PRESETS[colorIndex].g * 255}, ${COLOR_PRESETS[colorIndex].b * 255})` }}>
                                                        {text || 'WATERMARK'}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="font-bold" style={{ fontSize: fontSize * 0.4, transform: `rotate(${rotation}deg)`, color: `rgb(${COLOR_PRESETS[colorIndex].r * 255}, ${COLOR_PRESETS[colorIndex].g * 255}, ${COLOR_PRESETS[colorIndex].b * 255})` }}>
                                        {text || 'WATERMARK'}
                                    </span>
                                )}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-gray-300 text-xs font-bold uppercase">Preview</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                        <button onClick={handleApply} disabled={!text.trim()} className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            Add Watermark
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Adding watermark..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={handleReset} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Try Again</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-black mb-2">Watermark Added!</h3>
                    <p className="text-gray-600 mb-6">"{text}" watermark applied to all pages.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
