/**
 * PDF Image Conversion Utilities
 * 
 * Provides functions for converting images to PDF and PDF pages to images.
 * All processing happens entirely in the browser.
 * 
 * @module pdf-images
 */

import { PDFDocument } from 'pdf-lib';

export { downloadBlob, formatBytes } from './shared';

/**
 * Page size presets in points (72 points per inch).
 */
export const PAGE_SIZES = {
    'A4': { width: 595.28, height: 841.89 },
    'Letter': { width: 612, height: 792 },
    'Fit to Image': null, // Will use image dimensions
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;

/**
 * Converts multiple image files to a single PDF.
 * 
 * @param files - Array of image files (JPG, PNG)
 * @param pageSize - Page size preset or 'Fit to Image'
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to a Blob of the resulting PDF
 */
export async function imagesToPdf(
    files: File[],
    pageSize: PageSizeKey = 'A4',
    onProgress?: (progress: number) => void,
): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const bytes = new Uint8Array(await file.arrayBuffer());

        let image;
        const type = file.type.toLowerCase();
        if (type === 'image/png') {
            image = await pdfDoc.embedPng(bytes);
        } else {
            // Treat everything else as JPEG
            image = await pdfDoc.embedJpg(bytes);
        }

        const dims = image.scale(1);
        let pageWidth: number;
        let pageHeight: number;

        const sizeConfig = PAGE_SIZES[pageSize];
        if (!sizeConfig) {
            // Fit to image
            pageWidth = dims.width;
            pageHeight = dims.height;
        } else {
            pageWidth = sizeConfig.width;
            pageHeight = sizeConfig.height;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Scale image to fit within the page while maintaining aspect ratio
        const scaleX = pageWidth / dims.width;
        const scaleY = pageHeight / dims.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = dims.width * scale;
        const scaledHeight = dims.height * scale;
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        page.drawImage(image, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
        });

        if (onProgress) {
            onProgress(Math.round(((i + 1) / files.length) * 100));
        }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
