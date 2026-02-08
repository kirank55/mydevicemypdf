/**
 * PDF Compression Utilities
 * 
 * This module provides client-side PDF compression using the @quicktoolsone/pdf-compress
 * library. All processing happens entirely in the browser - files never leave the device.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * HOW PDF COMPRESSION WORKS
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * PDFs are complex documents containing multiple types of content:
 * - Text and fonts
 * - Vector graphics
 * - Embedded images (often 80-95% of file size)
 * - Metadata and structural information
 * 
 * This library uses a MULTI-STRATEGY approach to achieve optimal compression:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │ STRATEGY 1: LOSSLESS STRUCTURAL OPTIMIZATION (using pdf-lib)                       │
 * ├─────────────────────────────────────────────────────────────────────────────────────┤
 * │ • Object Stream Compression: Combines multiple small PDF objects into compressed   │
 * │   streams, reducing overhead from individual object headers                         │
 * │ • Removes orphaned/unused objects: Pages to a new document, leaving behind any     │
 * │   unreferenced resources from the original                                          │
 * │ • Optimizes internal references: Streamlines the PDF's cross-reference table       │
 * │ • Typical reduction: 5-15% for most PDFs                                           │
 * └─────────────────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │ STRATEGY 2: IMAGE RE-COMPRESSION (using pdf.js + Canvas API)                       │
 * ├─────────────────────────────────────────────────────────────────────────────────────┤
 * │ This is where the major file size reduction happens for image-heavy PDFs:          │
 * │                                                                                     │
 * │ 1. RENDER: Each page is rendered using Mozilla's pdf.js library                    │
 * │ 2. ADAPTIVE DPI: Resolution is adjusted based on file size:                        │
 * │    • 50MB+  → 50 DPI  (extremely aggressive)                                       │
 * │    • 20-50MB → 75 DPI                                                               │
 * │    • 10-20MB → 100 DPI                                                              │
 * │    • <10MB  → 150 DPI                                                               │
 * │ 3. JPEG COMPRESSION: Rendered pages are compressed as JPEG with quality:           │
 * │    • Lossless preset: Skips this strategy entirely (no image recompression)        │
 * │    • Max preset: 50% JPEG quality (aggressive)                                      │
 * │ 4. REBUILD: A new PDF is created with the compressed page images                   │
 * │ 5. MEMORY-SAFE: Canvas cleanup between pages, extra delays for large files         │
 * │                                                                                     │
 * │ Typical reduction: 40-90% for image-heavy PDFs, scanned documents                  │
 * └─────────────────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │ STRATEGY 3: BEST RESULT SELECTION                                                  │
 * ├─────────────────────────────────────────────────────────────────────────────────────┤
 * │ The library compares results from both strategies and returns the smallest file    │
 * │ that is still smaller than the original. If no compression helps, returns original.│
 * └─────────────────────────────────────────────────────────────────────────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * COMPRESSION PRESETS
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * LOSSLESS:
 *   - Uses ONLY Strategy 1 (structural optimization)
 *   - No quality loss - text remains crisp, images unchanged
 *   - Best for: text-heavy documents, legal documents, archival
 *   - Expected reduction: 5-15%
 * 
 * MAXIMUM:
 *   - Uses Strategy 1 + Strategy 2 (full image recompression)
 *   - Aggressive JPEG quality (50%) and adaptive DPI
 *   - Best for: image-heavy PDFs, scanned documents, photos
 *   - Expected reduction: 60-90% for image-heavy content
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * BROWSER REQUIREMENTS
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * - Canvas API (for image rendering/compression)
 * - Modern ES2020+ JavaScript support
 * - PDF.js worker file (served from /pdf.js/pdf.worker.min.mjs)
 * - Supported: Chrome/Edge 90+, Firefox 89+, Safari 15+
 * 
 * @module pdf-utils
 */

import { compress, type ProgressEvent } from '@quicktoolsone/pdf-compress';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CompressionResult {
    /** Original file size in bytes */
    originalSize: number;
    /** Compressed file size in bytes */
    compressedSize: number;
    /** The compressed PDF as a Blob, ready for download */
    blob: Blob;
    /** Suggested output filename (original name + "_compressed.pdf") */
    fileName: string;
}

export interface CompressionOptions {
    /** 
     * Compression quality preset:
     * - 'lossless': Structural optimization only (5-15% reduction)
     * - 'maximum': Full image recompression (60-90% reduction)
     * - 'extreme': Aggressive rasterization at very low DPI (80-95% reduction, text becomes unselectable)
     */
    quality: 'lossless' | 'maximum' | 'extreme';
    /** Progress callback, receives 0-100 percentage */
    onProgress?: (progress: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps our simplified quality levels to the library's internal presets.
 * 
 * Library presets:
 * - 'lossless': Structural optimization only (pdf-lib)
 * - 'balanced': Smart multi-strategy with 70% JPEG quality
 * - 'max': Aggressive compression with 50% JPEG quality
 * 
 * For 'extreme', we use 'max' preset with custom overrides for even more aggressive settings.
 */
const QUALITY_TO_PRESET = {
    lossless: 'lossless',
    maximum: 'max',
    extreme: 'max', // Uses max preset with custom DPI/quality overrides
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPRESSION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compresses a PDF file entirely in the browser.
 * 
 * @example
 * ```typescript
 * const result = await compressPDF(file, {
 *     quality: 'maximum',
 *     onProgress: (percent) => console.log(`${percent}% complete`)
 * });
 * 
 * console.log(`Reduced from ${result.originalSize} to ${result.compressedSize} bytes`);
 * downloadBlob(result.blob, result.fileName);
 * ```
 * 
 * @param file - The PDF File object to compress
 * @param options - Compression options including quality preset and progress callback
 * @returns Promise resolving to compression result with the compressed PDF blob
 * @throws Error if the PDF cannot be parsed or compression fails
 */
export async function compressPDF(
    file: File,
    options: CompressionOptions
): Promise<CompressionResult> {
    const { quality, onProgress } = options;

    // Step 1: Convert File to ArrayBuffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;

    // Step 2: Map our quality setting to library preset
    const preset = QUALITY_TO_PRESET[quality];

    // Step 3: Compress using @quicktoolsone/pdf-compress
    // The library handles all strategies internally and returns the best result
    const result = await compress(arrayBuffer, {
        preset,
        onProgress: (event: ProgressEvent) => {
            // Forward progress updates (0-100 scale)
            onProgress?.(event.progress);
        },
        // Extreme mode: use very aggressive settings
        // - 36 DPI renders text at ~half the resolution of thumbnail mode
        // - 30% JPEG quality for maximum compression
        // - Force rasterization: converts ALL content (including text) to images
        ...(quality === 'extreme' && {
            targetDPI: 36,
            jpegQuality: 0.3,
            enableRasterization: true,
            preserveMetadata: false,
        }),
    });

    // Step 4: Create output blob with proper MIME type
    const compressedBlob = new Blob([result.pdf], { type: 'application/pdf' });

    // Step 5: Generate output filename
    const baseName = file.name.replace(/\.pdf$/i, '');
    const outputName = `${baseName}_compressed.pdf`;

    return {
        originalSize,
        compressedSize: result.stats.compressedSize,
        blob: compressedBlob,
        fileName: outputName,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Calculates the compression percentage achieved.
 * 
 * @example
 * getCompressionPercent(1000, 300) // 70 (70% smaller)
 * 
 * @param original - Original size in bytes
 * @param compressed - Compressed size in bytes
 * @returns Percentage reduction (0-100), rounded to nearest integer
 */
export function getCompressionPercent(original: number, compressed: number): number {
    if (original === 0) return 0;
    return Math.round(((original - compressed) / original) * 100);
}
