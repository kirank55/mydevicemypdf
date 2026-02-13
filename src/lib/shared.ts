/**
 * Shared utility functions used across PDF tools.
 *
 * @module shared
 */

/**
 * Triggers a browser download of a Blob as a file.
 *
 * Creates a temporary anchor element, triggers the download, and cleans up.
 * Works in all modern browsers.
 *
 * @param blob - The Blob to download
 * @param fileName - The filename to save as
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
 * Formats a byte count into a human-readable string.
 *
 * @example
 * formatBytes(1536) // "1.5 KB"
 * formatBytes(1048576) // "1 MB"
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
