/**
 * PDF Split Utilities
 * 
 * This module provides client-side PDF splitting using pdf-lib.
 * All processing happens entirely in the browser - files never leave the device.
 * 
 * @module pdf-split
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PageRange {
    start: number;
    end: number;
}

export interface SplitResult {
    /** Array of split PDF blobs */
    pages: SplitPage[];
    /** Total number of pages in the original PDF */
    totalPages: number;
    /** Original filename */
    originalName: string;
}

export interface SplitPage {
    /** Page number(s) in the PDF (1-indexed) */
    pageNumbers: number[];
    /** The PDF blob for this page/range */
    blob: Blob;
    /** Suggested filename */
    fileName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a page range string into an array of page numbers.
 * 
 * Supports formats like:
 * - "1" - single page
 * - "1-5" - range of pages
 * - "1, 3, 5" - comma-separated pages
 * - "1-3, 5, 7-10" - mixed format
 * 
 * @param rangeStr - The page range string to parse
 * @param totalPages - Total number of pages in the PDF (for validation)
 * @returns Array of page numbers (1-indexed)
 * @throws Error if the range is invalid
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(s => s.trim()).filter(s => s);

    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-').map(s => s.trim());
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);

            if (isNaN(start) || isNaN(end)) {
                throw new Error(`Invalid range: "${part}"`);
            }
            if (start > end) {
                throw new Error(`Invalid range: "${part}" (start > end)`);
            }
            if (start < 1 || end > totalPages) {
                throw new Error(`Range "${part}" is out of bounds (PDF has ${totalPages} pages)`);
            }

            for (let i = start; i <= end; i++) {
                pages.add(i);
            }
        } else {
            const page = parseInt(part, 10);
            if (isNaN(page)) {
                throw new Error(`Invalid page number: "${part}"`);
            }
            if (page < 1 || page > totalPages) {
                throw new Error(`Page ${page} is out of bounds (PDF has ${totalPages} pages)`);
            }
            pages.add(page);
        }
    }

    if (pages.size === 0) {
        throw new Error('No pages specified');
    }

    return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Validates a page range string without parsing it fully.
 * 
 * @param rangeStr - The page range string to validate
 * @param totalPages - Total number of pages in the PDF
 * @returns Object with isValid boolean and optional error message
 */
export function validatePageRange(rangeStr: string, totalPages: number): { isValid: boolean; error?: string } {
    try {
        parsePageRange(rangeStr, totalPages);
        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: error instanceof Error ? error.message : 'Invalid range' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the page count of a PDF file.
 * 
 * @param file - The PDF file to count pages in
 * @returns Promise resolving to the number of pages
 */
export async function getPdfPageCount(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
}

/**
 * Extracts specific pages from a PDF file.
 * 
 * @param file - The source PDF file
 * @param pageNumbers - Array of page numbers to extract (1-indexed)
 * @returns Promise resolving to a Blob containing the new PDF
 */
export async function extractPages(file: File, pageNumbers: number[]): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const newPdf = await PDFDocument.create();

    // Convert 1-indexed page numbers to 0-indexed
    const pageIndices = pageNumbers.map(p => p - 1);
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);

    for (const page of copiedPages) {
        newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    // Create a new Uint8Array with explicit ArrayBuffer to fix TypeScript 5.6+ strict typing
    // pdf-lib returns Uint8Array<ArrayBufferLike> which isn't directly assignable to BlobPart
    const blobData = new Uint8Array(pdfBytes);
    return new Blob([blobData], { type: 'application/pdf' });
}

/**
 * Splits a PDF by extracting pages based on a range string.
 * 
 * @param file - The source PDF file
 * @param rangeStr - Page range string (e.g., "1-3, 5, 7-10")
 * @returns Promise resolving to split result
 */
export async function splitPdfByRange(file: File, rangeStr: string): Promise<SplitResult> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    const baseName = file.name.replace(/\.pdf$/i, '');
    const pageNumbers = parsePageRange(rangeStr, totalPages);

    const blob = await extractPages(file, pageNumbers);
    const pageLabel = pageNumbers.length === 1
        ? `page_${pageNumbers[0]}`
        : `pages_${pageNumbers[0]}-${pageNumbers[pageNumbers.length - 1]}`;

    return {
        pages: [{
            pageNumbers,
            blob,
            fileName: `${baseName}_${pageLabel}.pdf`,
        }],
        totalPages,
        originalName: file.name,
    };
}

/**
 * Splits a PDF into individual pages.
 * 
 * @param file - The source PDF file
 * @param onProgress - Optional progress callback (0-100)
 * @returns Promise resolving to split result with all individual pages
 */
export async function splitPdfAllPages(
    file: File,
    onProgress?: (progress: number) => void
): Promise<SplitResult> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();
    const baseName = file.name.replace(/\.pdf$/i, '');

    const pages: SplitPage[] = [];

    for (let i = 1; i <= totalPages; i++) {
        const blob = await extractPages(file, [i]);
        pages.push({
            pageNumbers: [i],
            blob,
            fileName: `${baseName}_page_${i}.pdf`,
        });

        if (onProgress) {
            onProgress(Math.round((i / totalPages) * 100));
        }
    }

    return {
        pages,
        totalPages,
        originalName: file.name,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Downloads a single blob as a file.
 * 
 * @param blob - The blob to download
 * @param fileName - The filename to use
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Creates a ZIP file containing all split pages and downloads it.
 * 
 * @param pages - Array of split pages
 * @param zipFileName - Name for the ZIP file
 */
export async function downloadAsZip(pages: SplitPage[], zipFileName: string): Promise<void> {
    const zip = new JSZip();

    for (const page of pages) {
        zip.file(page.fileName, page.blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, zipFileName);
}

/**
 * Formats bytes into a human-readable string.
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string like "1.5 MB"
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
