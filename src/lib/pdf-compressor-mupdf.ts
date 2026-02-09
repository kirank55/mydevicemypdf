// We use dynamic import to configure the WASM path before mupdf loads
let mupdf: any = null;

async function getMupdf() {
    if (mupdf) return mupdf;

    // Configure the WASM path globally before importing mupdf
    // This hook is used by the mupdf emscripten module
    (window as any)["$libmupdf_wasm_Module"] = {
        locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) {
                // Return variable URL based on environment if needed, 
                // but here we just use the public path where we copied the file.
                return '/mupdf-wasm.wasm';
            }
            return prefix + path;
        }
    };

    mupdf = await import('mupdf');
    return mupdf;
}

import { PDFDocument } from 'pdf-lib';

/**
 * Compresses a PDF using mupdf by rasterizing pages to low-quality images.
 * This effectively implements an "Extreme" compression mode.
 * 
 * @param file - The PDF File to compress
 * @returns Promise resolving to the compressed PDF Blob
 */
export async function compressExtreme(file: File, sliderValue: number): Promise<Blob> {
    try {
        const m = await getMupdf();

        // 1. Load the document with mupdf
        const buffer = await file.arrayBuffer();
        const mupdfDoc = m.Document.openDocument(new Uint8Array(buffer), "application/pdf");

        // 2. Create a new PDF with pdf-lib for output
        const pdfLibDoc = await PDFDocument.create();

        const pageCount = mupdfDoc.countPages();

        // 3. Process each page
        for (let i = 0; i < pageCount; i++) {
            const page = mupdfDoc.loadPage(i);

            // Calculate dimensions at 36 DPI (Standard screen is 72, 36 is half resolution)
            const scale = 36 / 72;
            const matrix = m.Matrix.scale(scale, scale);

            // Render to pixmap
            const pixmap = page.toPixmap(matrix, m.ColorSpace.DeviceRGB, false);

            // Convert to JPEG with 30% quality
            const jpegData = pixmap.asJPEG(100 - sliderValue);

            // Embed into pdf-lib document
            const jpgImage = await pdfLibDoc.embedJpg(jpegData);

            // Get original page dimensions to maintain aspect ratio in the new PDF
            const bounds = page.getBounds(); // [x0, y0, x1, y1]
            const width = bounds[2] - bounds[0];
            const height = bounds[3] - bounds[1];

            // Add page to new PDF
            const newPage = pdfLibDoc.addPage([width, height]);

            // Draw the compressed image
            newPage.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });
        }

        // 4. Save the new PDF
        const pdfBytes = await pdfLibDoc.save();

        return new Blob([pdfBytes as any], { type: 'application/pdf' });
    } catch (error) {
        console.error("Error in compressExtreme:", error);
        throw error;
    }
}

/**
 * Compresses a PDF using mupdf's garbage collection and stream compression.
 * This is a lossless operation that removes unused objects and compresses streams.
 * 
 * @param file - The PDF File to compress
 * @returns Promise resolving to the compressed PDF Blob
 */
export async function compressLossless(file: File): Promise<Blob> {
    try {
        const m = await getMupdf();
        const buffer = await file.arrayBuffer();

        // Load the document
        const doc = m.Document.openDocument(new Uint8Array(buffer), "application/pdf");

        // Ensure we have a PDF document to access saveToBuffer
        const pdfDoc = doc.asPDF();
        if (!pdfDoc) {
            throw new Error("Failed to open document as PDF");
        }

        // Save with compression options
        // garbage=4: Deduplicate objects and remove unused ones (most aggressive GC)
        // compress=true: Compress streams
        // clean=true: Clean content streams
        const compressedBuffer = pdfDoc.saveToBuffer("garbage=4,compress=yes,clean=yes");

        // Convert mupdf Buffer to Uint8Array and ensure we copy the data before cleanup
        const data = new Uint8Array(compressedBuffer.asUint8Array());

        // Clean up WASM memory
        compressedBuffer.destroy();

        // mupdf returns a Uint8Array (or similar view), wrap in Blob
        return new Blob([data], { type: 'application/pdf' });
    } catch (error) {
        console.error("Error in compressLossless:", error);
        throw error;
    }
}
