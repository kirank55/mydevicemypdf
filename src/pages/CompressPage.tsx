import { useState } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import {
  compressPDF,
  downloadBlob,
  formatBytes,
  getCompressionPercent,
  type CompressionResult,
  type LosslessEngineResult,
  type LosslessEngine,
} from '../lib/pdf-utils';

const ALL_LOSSLESS_ENGINES: { engine: LosslessEngine; label: string }[] = [
  { engine: 'mupdf', label: 'MuPDF' },
  { engine: 'pdf-lib', label: 'pdf-lib' },
  { engine: 'ghostscript', label: 'Ghostscript' },
  { engine: 'qpdf', label: 'QPDF' },
];

type Quality = 'lossless' | 'extreme';

function isSuccessful(
  result: LosslessEngineResult
): result is LosslessEngineResult & { blob: Blob; fileName: string; compressedSize: number } {
  return result.status === 'success' && result.blob !== null && result.fileName !== null && result.compressedSize !== null;
}

function qualityDescription(quality: Quality): string {
  if (quality === 'lossless') {
    return 'MuPDF, pdf-lib, Ghostscript, and QPDF';
  }
  return 'Tiny file, no text select';
}

function formatDeltaLabel(percent: number): string {
  if (percent >= 0) return `${percent}% smaller`;
  return `${Math.abs(percent)}% larger`;
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>('lossless');
  const [compressionLevel, setCompressionLevel] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('Compressing your PDF...');
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [partialResults, setPartialResults] = useState<LosslessEngineResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressStatus('Compressing your PDF...');
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressStatus('Starting compression...');
    setResult(null);
    setPartialResults([]);

    try {
      const compressionResult = await compressPDF(file, {
        quality,
        compressionLevel: quality === 'extreme' ? compressionLevel : undefined,
        onProgress: (nextProgress, status) => {
          setProgress(nextProgress);
          if (status) setProgressStatus(status);
        },
        onEngineResult: (engineResult) => {
          setPartialResults((prev) => [...prev, engineResult]);
        },
      });

      setResult(compressionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadBest = () => {
    if (result) {
      downloadBlob(result.blob, result.fileName);
    }
  };

  const handleDownloadEngine = (engineResult: LosslessEngineResult) => {
    if (!isSuccessful(engineResult)) return;
    downloadBlob(engineResult.blob, engineResult.fileName);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setPartialResults([]);
    setError(null);
    setProgress(0);
    setProgressStatus('Compressing your PDF...');
  };

  const handleTryAgain = () => {
    setResult(null);
    setPartialResults([]);
    setError(null);
    setProgress(0);
    setProgressStatus('Compressing your PDF...');
  };

  const bestResult = result?.engineResults.find((entry) => isSuccessful(entry)) ?? null;

  // Determine which engines have completed and which are still pending
  const completedEngines = new Set(partialResults.map((r) => r.engine));
  const showLiveResults = isProcessing && quality === 'lossless' && partialResults.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold uppercase tracking-widest text-green-600 border-2 border-green-500 rounded-full bg-green-50">
          Your Files Never Leave Your Device
        </span>
        <h1 className="text-5xl font-black mb-4">Compress PDF</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">Reduce your PDF file size while maintaining quality.</p>
      </div>

      <div className="space-y-8">
        {!result && (
          <FileDropzone onFileSelect={handleFileSelect} label="Drop your PDF here to compress" selectedFile={file} />
        )}

        {file && !result && !isProcessing && (
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="font-black text-lg mb-4">Compression Quality</h3>

            <div className="grid grid-cols-2 gap-4">
              {(['lossless', 'extreme'] as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200
                    ${quality === q ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black'}
                  `}
                >
                  <div className="font-black text-lg capitalize">{q}</div>
                  <div className={`text-sm ${quality === q ? 'text-gray-300' : 'text-gray-500'}`}>
                    {qualityDescription(q)}
                  </div>
                </button>
              ))}
            </div>

            {quality === 'extreme' && (
              <div className="mt-6 p-4 bg-gray-100 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-sm text-gray-700">Compression Level</label>
                  <span className="font-bold text-sm bg-black text-white px-2 py-1 rounded">{compressionLevel}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={compressionLevel}
                  onChange={(event) => setCompressionLevel(Number(event.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Lower Compression</span>
                  <span>Higher Compression</span>
                </div>
              </div>
            )}

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

        {isProcessing && (
          <div className="bg-gray-50 rounded-2xl p-8">
            <ProgressIndicator progress={progress} status={progressStatus} />
          </div>
        )}

        {showLiveResults && file && (
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="font-black text-xl mb-4">Engine Results (live)</h3>
            <div className="space-y-3">
              {ALL_LOSSLESS_ENGINES.map(({ engine, label }) => {
                const engineResult = partialResults.find((r) => r.engine === engine);
                const pending = !completedEngines.has(engine);

                if (pending) {
                  return (
                    <div
                      key={engine}
                      className="rounded-xl border-2 border-gray-200 bg-white/60 p-4 flex items-center gap-3"
                    >
                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="font-bold text-gray-400">{label}</span>
                      <span className="text-sm text-gray-400 ml-auto">Running...</span>
                    </div>
                  );
                }

                if (!engineResult) return null;
                const successful = isSuccessful(engineResult);

                return (
                  <div
                    key={engine}
                    className={`rounded-xl border-2 p-4 ${successful ? 'border-green-300 bg-white' : 'border-red-200 bg-white/80'
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-lg">{engineResult.label}</div>
                        {successful ? (
                          <div className="text-sm text-gray-600">
                            {formatBytes(engineResult.compressedSize)}{' '}
                            {engineResult.compressionPercent !== null
                              ? `(${formatDeltaLabel(engineResult.compressionPercent)})`
                              : ''}
                          </div>
                        ) : (
                          <div className="text-sm text-red-600">
                            Failed: {engineResult.error || 'Unknown error'}
                          </div>
                        )}
                      </div>

                      {successful && (
                        <button
                          onClick={() => handleDownloadEngine(engineResult)}
                          className="px-4 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {result && (
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="font-black text-2xl mb-2 text-center">Compression Complete!</h3>

            {bestResult && result.engine !== 'extreme' && (
              <p className="text-center text-gray-600 mb-6">
                Best result: <span className="font-black">{bestResult.label}</span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
                <div className="text-gray-500 font-medium mb-2">Original Size</div>
                <div className="text-3xl font-black">{formatBytes(result.originalSize)}</div>
              </div>

              <div className="bg-white rounded-xl p-6 text-center border-2 border-black">
                <div className="text-gray-500 font-medium mb-2">Best Compressed Size</div>
                <div className="text-3xl font-black">{formatBytes(result.compressedSize)}</div>
              </div>
            </div>

            <div className="text-center mb-8">
              {result.compressedSize < result.originalSize ? (
                <div className="inline-block bg-green-100 text-green-700 px-6 py-3 rounded-full font-black text-xl">
                  {getCompressionPercent(result.originalSize, result.compressedSize)}% smaller
                </div>
              ) : (
                <div className="inline-block bg-yellow-100 text-yellow-700 px-6 py-3 rounded-full font-bold">
                  This PDF is already well-optimized
                </div>
              )}
            </div>

            {quality === 'lossless' && (
              <div className="mb-8">
                <h4 className="font-black text-lg mb-4">Lossless Engine Results (best first)</h4>
                <div className="space-y-3">
                  {result.engineResults.map((engineResult, index) => {
                    const successful = isSuccessful(engineResult);
                    const isBest = index === 0 && successful;

                    return (
                      <div
                        key={engineResult.engine}
                        className={`rounded-xl border-2 p-4 ${isBest ? 'border-black bg-white' : 'border-gray-200 bg-white/80'
                          }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-black text-lg">
                              {engineResult.label} {isBest ? '(Best)' : ''}
                            </div>
                            {successful ? (
                              <div className="text-sm text-gray-600">
                                {formatBytes(engineResult.compressedSize)}{' '}
                                {engineResult.compressionPercent !== null
                                  ? `(${formatDeltaLabel(engineResult.compressionPercent)})`
                                  : ''}
                              </div>
                            ) : (
                              <div className="text-sm text-red-600">
                                Failed: {engineResult.error || 'Unknown error'}
                              </div>
                            )}
                          </div>

                          {successful && (
                            <button
                              onClick={() => handleDownloadEngine(engineResult)}
                              className="px-4 py-2 border-2 border-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleDownloadBest}
                className="
                  flex-1 py-4 px-8 bg-black text-white font-black text-xl
                  rounded-xl hover:bg-gray-800 transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                "
              >
                Download Best Result
              </button>

              <button
                onClick={handleTryAgain}
                className="
                  py-4 px-8 border-2 border-black font-black text-xl
                  rounded-xl hover:bg-gray-100 transition-all duration-200
                "
              >
                Try Again
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
