
/**
 * PDF Merge Utilities
 * 
 * This module provides client-side PDF merging using pdf-lib.
 * All processing happens entirely in the browser.
 * 
 * @module pdf-merge
 */

import { PDFDocument } from 'pdf-lib';

/**
 * Merges multiple PDF files into a single PDF.
 * 
 * @param files - Array of PDF files to merge (in order)
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise resolving to the merged PDF Blob
 */
export async function mergePdfs(files: File[], onProgress?: (progress: number) => void): Promise<Blob> {
    const mergedPdf = await PDFDocument.create();
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
        });

        if (onProgress) {
            onProgress(Math.round(((i + 1) / totalFiles) * 100));
        }
    }

    const pdfBytes = await mergedPdf.save();
    // Create a new Uint8Array with explicit ArrayBuffer to fix TypeScript 5.6+ strict typing
    // pdf-lib returns Uint8Array<ArrayBufferLike> which isn't directly assignable to BlobPart
    const blobData = new Uint8Array(pdfBytes);
    return new Blob([blobData], { type: 'application/pdf' });
}

/**
 * Downloads a blob as a file.
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
