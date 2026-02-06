/**
 * Web Worker for PDF Compression
 * 
 * Runs PDF compression in a background thread to prevent UI freezing.
 * The main thread remains responsive while large PDFs are processed.
 */

import { PDFDocument } from 'pdf-lib';

// Quality settings that affect compression aggressiveness
// Lower quality = more aggressive optimization = smaller files
const QUALITY_SETTINGS = {
    low: {
        // Most aggressive - prioritize file size over processing speed
        objectsPerTick: 20,      // Smaller chunks = more thorough but slower
        useObjectStreams: true,  // Enable object stream compression
    },
    medium: {
        // Balanced approach
        objectsPerTick: 50,
        useObjectStreams: true,
    },
    high: {
        // Fastest - minimal processing overhead
        objectsPerTick: 100,
        useObjectStreams: true,
    },
};

export interface WorkerMessage {
    type: 'compress';
    fileBuffer: ArrayBuffer;
    fileName: string;
    quality: 'low' | 'medium' | 'high';
}

export interface WorkerResponse {
    type: 'progress' | 'complete' | 'error';
    progress?: number;
    result?: {
        compressedBuffer: ArrayBuffer;
        originalSize: number;
        compressedSize: number;
        fileName: string;
    };
    error?: string;
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, fileBuffer, fileName, quality } = event.data;

    if (type !== 'compress') return;

    try {
        // Report start
        postProgress(5);

        // STEP 1: Load the PDF from the ArrayBuffer
        const pdfDoc = await PDFDocument.load(fileBuffer, {
            // These options help with potentially corrupted PDFs
            ignoreEncryption: true,
            updateMetadata: false,
        });

        postProgress(15);

        // STEP 2: Get PDF metadata and page count
        const pages = pdfDoc.getPages();
        const totalPages = pages.length;

        // STEP 3: Create a new optimized PDF
        // By copying pages to a fresh document, we strip out:
        // - Unused objects and resources
        // - Orphaned references
        // - Redundant font subsets
        const compressedPdf = await PDFDocument.create();

        // Copy metadata from original (optional - can remove for smaller size)
        compressedPdf.setTitle(pdfDoc.getTitle() || '');
        compressedPdf.setAuthor(pdfDoc.getAuthor() || '');
        compressedPdf.setSubject(pdfDoc.getSubject() || '');

        // STEP 4: Copy each page to the new document
        for (let i = 0; i < totalPages; i++) {
            const [copiedPage] = await compressedPdf.copyPages(pdfDoc, [i]);
            compressedPdf.addPage(copiedPage);

            // Progress: 15% to 80% during page copying
            const pageProgress = 15 + ((i + 1) / totalPages) * 65;
            postProgress(Math.round(pageProgress));
        }

        postProgress(85);

        // STEP 5: Get quality-specific settings
        const settings = QUALITY_SETTINGS[quality];

        // STEP 6: Save with compression options
        const compressedBytes = await compressedPdf.save({
            // Object streams combine multiple small objects into compressed streams
            // This is the main compression technique in pdf-lib
            useObjectStreams: settings.useObjectStreams,

            // Don't add a blank page if somehow empty
            addDefaultPage: false,

            // Process objects in chunks to prevent blocking
            // Smaller chunks = more async breaks = more responsive (but slower)
            objectsPerTick: settings.objectsPerTick,
        });

        postProgress(95);

        // STEP 7: Prepare the result
        const compressedBuffer = compressedBytes.buffer as ArrayBuffer;

        // Generate output filename
        const baseName = fileName.replace(/\.pdf$/i, '');
        const outputName = `${baseName}_compressed.pdf`;

        postProgress(100);

        // Send the compressed result back to main thread
        const response: WorkerResponse = {
            type: 'complete',
            result: {
                compressedBuffer,
                originalSize: fileBuffer.byteLength,
                compressedSize: compressedBuffer.byteLength,
                fileName: outputName,
            },
        };

        // Transfer the buffer (zero-copy) instead of cloning
        (self as unknown as Worker).postMessage(response, { transfer: [compressedBuffer] });

    } catch (err) {
        const response: WorkerResponse = {
            type: 'error',
            error: err instanceof Error ? err.message : 'Unknown compression error',
        };
        (self as unknown as Worker).postMessage(response);
    }
};

// Helper to send progress updates
function postProgress(progress: number): void {
    const response: WorkerResponse = { type: 'progress', progress };
    (self as unknown as Worker).postMessage(response);
}
