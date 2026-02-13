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


import { compressExtreme, compressLossless } from './pdf-compressor-mupdf';

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

     * - 'extreme': Aggressive rasterization at very low DPI (80-95% reduction, text becomes unselectable)
     */
    quality: 'lossless' | 'extreme';
    /** Compression level (0-100) for extreme mode. Higher means more compression (lower quality). */
    compressionLevel?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────



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

    const { quality, compressionLevel = 70 } = options;
    const originalSize = file.size;
    let baseName: string = file.name.replace(/\.pdf$/i, '');;

    let blob: Blob;

    if (quality === 'lossless') {
        blob = await compressLossless(file);
    } else {
        blob = await compressExtreme(file, compressionLevel);
    }

    return {
        blob,
        originalSize,
        compressedSize: blob.size,
        fileName: `${baseName}_compressed.pdf`,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS (re-exported from shared)
// ─────────────────────────────────────────────────────────────────────────────

export { downloadBlob, formatBytes } from './shared';

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

