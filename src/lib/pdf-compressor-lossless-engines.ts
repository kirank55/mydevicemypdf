import { PDFDocument } from 'pdf-lib';
import type { WasmModule as GhostscriptModule } from '@jspawn/ghostscript-wasm';
import type { WasmModule as QpdfModule } from '@jspawn/qpdf-wasm';

let qpdfModulePromise: Promise<QpdfModule> | null = null;
let ghostscriptModulePromise: Promise<GhostscriptModule> | null = null;

function createRunId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeUnlink(module: { FS: { unlink: (path: string) => void } }, path: string): void {
  try {
    module.FS.unlink(path);
  } catch {
    // Ignore cleanup failures.
  }
}

async function loadQpdfModule(): Promise<QpdfModule> {
  if (!qpdfModulePromise) {
    qpdfModulePromise = import('@jspawn/qpdf-wasm').then(({ default: createQpdfModule }) =>
      createQpdfModule({
        locateFile: (path, prefix) => (path.endsWith('.wasm') ? '/qpdf-wasm.wasm' : `${prefix || ''}${path}`),
        print: () => undefined,
        printErr: () => undefined,
      })
    );
  }

  return qpdfModulePromise;
}

async function loadGhostscriptModule(): Promise<GhostscriptModule> {
  if (!ghostscriptModulePromise) {
    ghostscriptModulePromise = import('@jspawn/ghostscript-wasm').then(
      ({ default: createGhostscriptModule }) =>
        createGhostscriptModule({
          locateFile: (path, prefix) =>
            path.endsWith('.wasm') ? '/ghostscript-wasm.wasm' : `${prefix || ''}${path}`,
          print: () => undefined,
          printErr: () => undefined,
        })
    );
  }

  return ghostscriptModulePromise;
}

export async function compressLosslessPdfLib(file: File): Promise<Blob> {
  const input = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(input, { updateMetadata: false });

  const output = await pdfDoc.save({
    addDefaultPage: false,
    updateFieldAppearances: false,
    useObjectStreams: true,
  });

  return new Blob([new Uint8Array(output)], { type: 'application/pdf' });
}

export async function compressLosslessQpdf(file: File): Promise<Blob> {
  const qpdf = await loadQpdfModule();
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  const runId = createRunId('qpdf');
  const inputPath = `/${runId}-input.pdf`;
  const outputPath = `/${runId}-output.pdf`;

  qpdf.FS.writeFile(inputPath, inputBytes);

  try {
    const exitCode = qpdf.callMain([
      '--stream-data=compress',
      '--object-streams=generate',
      '--recompress-flate',
      '--compression-level=9',
      inputPath,
      outputPath,
    ]);

    if (exitCode !== 0) {
      throw new Error(`QPDF exited with code ${exitCode}`);
    }

    const outputBytes = qpdf.FS.readFile(outputPath);
    return new Blob([new Uint8Array(outputBytes)], { type: 'application/pdf' });
  } finally {
    safeUnlink(qpdf, inputPath);
    safeUnlink(qpdf, outputPath);
  }
}

export async function compressLosslessGhostscript(file: File): Promise<Blob> {
  const ghostscript = await loadGhostscriptModule();
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  const runId = createRunId('ghostscript');
  const inputPath = `/${runId}-input.pdf`;
  const outputPath = `/${runId}-output.pdf`;

  ghostscript.FS.writeFile(inputPath, inputBytes);

  try {
    const exitCode = ghostscript.callMain([
      '-sDEVICE=pdfwrite',
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      '-dDetectDuplicateImages=true',
      '-dCompressFonts=true',
      '-dSubsetFonts=true',
      '-dDownsampleColorImages=false',
      '-dDownsampleGrayImages=false',
      '-dDownsampleMonoImages=false',
      '-dAutoFilterColorImages=false',
      '-dAutoFilterGrayImages=false',
      '-dColorImageFilter=/FlateEncode',
      '-dGrayImageFilter=/FlateEncode',
      '-dMonoImageFilter=/CCITTFaxEncode',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);

    if (exitCode !== 0) {
      throw new Error(`Ghostscript exited with code ${exitCode}`);
    }

    const outputBytes = ghostscript.FS.readFile(outputPath);
    return new Blob([new Uint8Array(outputBytes)], { type: 'application/pdf' });
  } finally {
    safeUnlink(ghostscript, inputPath);
    safeUnlink(ghostscript, outputPath);
  }
}
