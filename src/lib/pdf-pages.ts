/**
 * PDF Page Manipulation Utilities
 * 
 * Provides functions for removing, rotating, and reordering pages in a PDF.
 * All processing happens entirely in the browser using pdf-lib.
 * 
 * @module pdf-pages
 */

import { PDFDocument, degrees } from 'pdf-lib';

export { downloadBlob, formatBytes } from './shared';

/**
 * Removes specified pages from a PDF.
 * 
 * @param file - The source PDF file
 * @param pageNumbersToRemove - Array of 1-indexed page numbers to remove
 * @returns Promise resolving to a Blob of the resulting PDF
 */
export async function removePages(file: File, pageNumbersToRemove: number[]): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    const removeSet = new Set(pageNumbersToRemove);
    const keepIndices = Array.from({ length: totalPages }, (_, i) => i)
        .filter(i => !removeSet.has(i + 1));

    if (keepIndices.length === 0) {
        throw new Error('Cannot remove all pages from the PDF');
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, keepIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Rotates specified pages in a PDF by the given degrees.
 * 
 * @param file - The source PDF file
 * @param rotations - Map of 1-indexed page number to rotation in degrees (90, 180, 270)
 * @returns Promise resolving to a Blob of the resulting PDF
 */
export async function rotatePages(file: File, rotations: Record<number, number>): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    for (const [pageNumStr, rotation] of Object.entries(rotations)) {
        const pageIndex = parseInt(pageNumStr, 10) - 1;
        const page = pdfDoc.getPage(pageIndex);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rotation) % 360));
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Reorders pages in a PDF based on the given order.
 * 
 * @param file - The source PDF file
 * @param newOrder - Array of 1-indexed page numbers in the desired order
 * @returns Promise resolving to a Blob of the resulting PDF
 */
export async function reorderPages(file: File, newOrder: number[]): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    const newPdf = await PDFDocument.create();
    const indices = newOrder.map(p => p - 1);
    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Gets the page count of a PDF file.
 */
export async function getPdfPageCount(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
}
