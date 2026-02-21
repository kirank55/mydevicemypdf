import { compressExtreme, compressLossless as compressLosslessMupdf } from './pdf-compressor-mupdf';
import {
  compressLosslessGhostscript,
  compressLosslessPdfLib,
  compressLosslessQpdf,
} from './pdf-compressor-lossless-engines';

export type CompressionQuality = 'lossless' | 'extreme';
export type LosslessEngine = 'mupdf' | 'pdf-lib' | 'ghostscript' | 'qpdf';
export type EngineStatus = 'success' | 'failed';

export interface LosslessEngineResult {
  engine: LosslessEngine;
  label: string;
  status: EngineStatus;
  compressedSize: number | null;
  compressionPercent: number | null;
  blob: Blob | null;
  fileName: string | null;
  error: string | null;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  fileName: string;
  engine: LosslessEngine | 'extreme';
  engineResults: LosslessEngineResult[];
}

export interface CompressionOptions {
  quality: CompressionQuality;
  compressionLevel?: number;
  onProgress?: (progress: number, status?: string) => void;
  onEngineResult?: (result: LosslessEngineResult) => void;
}

interface LosslessEngineRunner {
  engine: LosslessEngine;
  label: string;
  run: (file: File) => Promise<Blob>;
}

const LOSSLESS_ENGINES: LosslessEngineRunner[] = [
  { engine: 'mupdf', label: 'MuPDF', run: compressLosslessMupdf },
  { engine: 'pdf-lib', label: 'pdf-lib', run: compressLosslessPdfLib },
  { engine: 'ghostscript', label: 'Ghostscript', run: compressLosslessGhostscript },
  { engine: 'qpdf', label: 'QPDF', run: compressLosslessQpdf },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unknown compression error';
}

function baseNameFor(file: File): string {
  return file.name.replace(/\.pdf$/i, '');
}

function getEngineFileName(baseName: string, engine: LosslessEngine): string {
  const suffix = engine.replace(/[^a-z0-9-]/gi, '-');
  return `${baseName}_compressed_${suffix}.pdf`;
}

function sortLosslessResults(results: LosslessEngineResult[]): LosslessEngineResult[] {
  const successful = results
    .filter((result) => result.status === 'success' && result.compressedSize !== null)
    .sort((a, b) => (a.compressedSize as number) - (b.compressedSize as number));

  const failed = results.filter((result) => result.status !== 'success');

  return [...successful, ...failed];
}

async function runLosslessEngines(
  file: File,
  originalSize: number,
  onProgress?: (progress: number, status?: string) => void,
  onEngineResult?: (result: LosslessEngineResult) => void
): Promise<LosslessEngineResult[]> {
  const baseName = baseNameFor(file);
  const results: LosslessEngineResult[] = [];
  const totalEngines = LOSSLESS_ENGINES.length;

  onProgress?.(5, 'Preparing lossless engines...');

  // Run sequentially to avoid large parallel WASM memory spikes on low-end devices.
  for (let index = 0; index < totalEngines; index++) {
    const runner = LOSSLESS_ENGINES[index];
    const startProgress = 10 + Math.floor((index / totalEngines) * 80);
    const doneProgress = 10 + Math.floor(((index + 1) / totalEngines) * 80);

    onProgress?.(startProgress, `Running ${runner.label} (${index + 1}/${totalEngines})...`);

    let engineResult: LosslessEngineResult;
    try {
      const blob = await runner.run(file);
      const compressedSize = blob.size;

      engineResult = {
        engine: runner.engine,
        label: runner.label,
        status: 'success',
        compressedSize,
        compressionPercent: getCompressionPercent(originalSize, compressedSize),
        blob,
        fileName: getEngineFileName(baseName, runner.engine),
        error: null,
      };
    } catch (error) {
      engineResult = {
        engine: runner.engine,
        label: runner.label,
        status: 'failed',
        compressedSize: null,
        compressionPercent: null,
        blob: null,
        fileName: null,
        error: toErrorMessage(error),
      };
    }

    results.push(engineResult);
    onEngineResult?.(engineResult);
    onProgress?.(doneProgress, `Finished ${runner.label}`);
  }

  onProgress?.(95, 'Ranking results...');
  return sortLosslessResults(results);
}

export async function compressPDF(file: File, options: CompressionOptions): Promise<CompressionResult> {
  const { quality, compressionLevel = 70, onProgress } = options;
  const originalSize = file.size;
  const baseName = baseNameFor(file);

  if (quality === 'extreme') {
    onProgress?.(10, 'Running extreme compression...');
    const blob = await compressExtreme(file, compressionLevel);
    onProgress?.(100, 'Compression complete');

    return {
      originalSize,
      compressedSize: blob.size,
      blob,
      fileName: `${baseName}_compressed.pdf`,
      engine: 'extreme',
      engineResults: [
        {
          engine: 'mupdf',
          label: 'MuPDF Extreme',
          status: 'success',
          compressedSize: blob.size,
          compressionPercent: getCompressionPercent(originalSize, blob.size),
          blob,
          fileName: `${baseName}_compressed.pdf`,
          error: null,
        },
      ],
    };
  }

  const { onEngineResult } = options;
  const engineResults = await runLosslessEngines(file, originalSize, onProgress, onEngineResult);
  const best = engineResults.find((result) => result.status === 'success');

  if (!best || !best.blob || best.compressedSize === null) {
    const failureSummary = engineResults
      .filter((result) => result.error)
      .map((result) => `${result.label}: ${result.error}`)
      .join(' | ');

    throw new Error(failureSummary || 'All compression engines failed');
  }

  onProgress?.(100, 'Compression complete');

  return {
    originalSize,
    compressedSize: best.compressedSize,
    blob: best.blob,
    fileName: `${baseName}_compressed.pdf`,
    engine: best.engine,
    engineResults,
  };
}

export { downloadBlob, formatBytes } from './shared';

export function getCompressionPercent(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}
