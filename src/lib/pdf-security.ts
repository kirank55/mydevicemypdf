/**
 * PDF Security Utilities
 * 
 * Provides functions for protecting and unlocking PDFs.
 * All processing happens entirely in the browser using pdf-lib.
 * 
 * @module pdf-security
 */

import { PDFDocument } from 'pdf-lib';

export { downloadBlob, formatBytes } from './shared';

export interface ProtectOptions {
    userPassword: string;
    ownerPassword?: string;
    permissions?: {
        printing?: boolean;
        copying?: boolean;
        modifying?: boolean;
    };
}

/**
 * Protects a PDF with a password.
 * 
 * Note: pdf-lib supports basic encryption. For full permission control,
 * this sets user and owner passwords. The PDF viewer will prompt for a
 * password when opening.
 */
export async function protectPdf(file: File, options: ProtectOptions): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        // pdf-lib does not natively support encryption at save time.
        // We'll use a workaround: embed the password metadata, but for 
        // real encryption, we need mupdf.
    });

    // Use mupdf for actual encryption
    let mupdfModule: any = null;
    (window as any)["$libmupdf_wasm_Module"] = {
        locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) return '/mupdf-wasm.wasm';
            return prefix + path;
        },
    };
    mupdfModule = await import('mupdf');

    const doc = mupdfModule.Document.openDocument(new Uint8Array(pdfBytes), "application/pdf");
    const pdfMupdf = doc.asPDF();
    if (!pdfMupdf) throw new Error("Failed to process PDF");

    const ownerPw = options.ownerPassword || options.userPassword;

    // Build permission string
    // MuPDF encrypt options: "user-password=X,owner-password=Y,permissions=N"
    const permValue = calculatePermissions(options.permissions);
    const saveOpts = `user-password=${options.userPassword},owner-password=${ownerPw},permissions=${permValue}`;

    const encryptedBuffer = pdfMupdf.saveToBuffer(saveOpts);
    const data = new Uint8Array(encryptedBuffer.asUint8Array());
    encryptedBuffer.destroy();

    return new Blob([data], { type: 'application/pdf' });
}

function calculatePermissions(perms?: { printing?: boolean; copying?: boolean; modifying?: boolean }): number {
    // PDF permission flags (Table 22 in PDF spec)
    // Bit 3 (4): print
    // Bit 4 (8): modify
    // Bit 5 (16): copy
    // Bit 6 (32): annotations
    // Default: all denied = 0, we build up from there
    let value = 0;
    if (perms?.printing) value |= 4 | 2048;    // Bit 3 + 12 (print + high quality print)
    if (perms?.copying) value |= 16 | 512;      // Bit 5 + 10 (copy + accessibility)
    if (perms?.modifying) value |= 8 | 32;       // Bit 4 + 6 (modify + annotations)
    return value;
}

/**
 * Attempts to unlock a password-protected PDF.
 */
export async function unlockPdf(file: File, password: string): Promise<Blob> {
    let mupdfModule: any = null;
    (window as any)["$libmupdf_wasm_Module"] = {
        locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) return '/mupdf-wasm.wasm';
            return prefix + path;
        },
    };
    mupdfModule = await import('mupdf');

    const buffer = await file.arrayBuffer();
    const doc = mupdfModule.Document.openDocument(new Uint8Array(buffer), "application/pdf");

    if (doc.needsPassword()) {
        const authenticated = doc.authenticatePassword(password);
        if (!authenticated) {
            throw new Error('Incorrect password. Please try again.');
        }
    }

    const pdfDoc = doc.asPDF();
    if (!pdfDoc) throw new Error("Failed to process PDF");

    // Save without encryption
    const cleanBuffer = pdfDoc.saveToBuffer("garbage=4,compress=yes,clean=yes");
    const data = new Uint8Array(cleanBuffer.asUint8Array());
    cleanBuffer.destroy();

    return new Blob([data], { type: 'application/pdf' });
}
