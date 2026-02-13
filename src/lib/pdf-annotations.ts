/**
 * PDF Annotation Utilities
 * 
 * Provides functions for adding page numbers and watermarks to PDFs.
 * All processing happens entirely in the browser using pdf-lib.
 * 
 * @module pdf-annotations
 */

import { PDFDocument, rgb, StandardFonts, radians as pdfRadians } from 'pdf-lib';

export { downloadBlob, formatBytes } from './shared';

export type NumberPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type NumberFormat = 'numeric' | 'roman' | 'page-of';

export interface PageNumberOptions {
    position: NumberPosition;
    fontSize: number;
    format: NumberFormat;
    startFrom: number;
    margin: number;
}

export interface WatermarkOptions {
    text: string;
    fontSize: number;
    opacity: number;
    rotation: number;
    color: { r: number; g: number; b: number };
    position: 'center' | 'tiled';
}

function toRoman(num: number): string {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
        while (num >= vals[i]) {
            result += syms[i];
            num -= vals[i];
        }
    }
    return result;
}

function formatPageNumber(pageNum: number, totalPages: number, format: NumberFormat): string {
    switch (format) {
        case 'roman': return toRoman(pageNum).toLowerCase();
        case 'page-of': return `Page ${pageNum} of ${totalPages}`;
        default: return String(pageNum);
    }
}

/**
 * Adds page numbers to every page of a PDF.
 */
export async function addPageNumbers(file: File, options: PageNumberOptions): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const displayNum = i + options.startFrom;
        const text = formatPageNumber(displayNum, totalPages - 1 + options.startFrom, options.format);
        const textWidth = font.widthOfTextAtSize(text, options.fontSize);

        let x: number;
        let y: number;

        switch (options.position) {
            case 'top-left':
                x = options.margin;
                y = height - options.margin - options.fontSize;
                break;
            case 'top-center':
                x = (width - textWidth) / 2;
                y = height - options.margin - options.fontSize;
                break;
            case 'top-right':
                x = width - textWidth - options.margin;
                y = height - options.margin - options.fontSize;
                break;
            case 'bottom-left':
                x = options.margin;
                y = options.margin;
                break;
            case 'bottom-center':
                x = (width - textWidth) / 2;
                y = options.margin;
                break;
            case 'bottom-right':
                x = width - textWidth - options.margin;
                y = options.margin;
                break;
        }

        page.drawText(text, {
            x,
            y,
            size: options.fontSize,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Adds a text watermark to every page of a PDF.
 */
export async function addWatermark(file: File, options: WatermarkOptions): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const radians = (options.rotation * Math.PI) / 180;

    for (const page of pages) {
        const { width, height } = page.getSize();

        if (options.position === 'tiled') {
            // Tile watermarks across the page
            const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
            const spacingX = textWidth + 100;
            const spacingY = options.fontSize + 120;

            for (let y = -height; y < height * 2; y += spacingY) {
                for (let x = -width; x < width * 2; x += spacingX) {
                    page.drawText(options.text, {
                        x,
                        y,
                        size: options.fontSize,
                        font,
                        color: rgb(options.color.r, options.color.g, options.color.b),
                        opacity: options.opacity,
                        rotate: pdfRadians(radians),
                    });
                }
            }
        } else {
            // Single centered watermark
            const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
            page.drawText(options.text, {
                x: (width - textWidth) / 2,
                y: (height - options.fontSize) / 2,
                size: options.fontSize,
                font,
                color: rgb(options.color.r, options.color.g, options.color.b),
                opacity: options.opacity,
                rotate: pdfRadians(radians),
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
