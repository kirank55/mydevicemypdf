
import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';

interface MultiFileDropzoneProps {
    onFilesSelect: (files: File[]) => void;
    accept?: string;
    maxSizeMB?: number;
    label?: string;
}

export default function MultiFileDropzone({
    onFilesSelect,
    accept = '.pdf',
    maxSizeMB = 100,
    label = 'Drop your PDFs here',
}: MultiFileDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateAndProcessFiles = (fileList: FileList | File[]) => {
        setError(null);
        const validFiles: File[] = [];
        const errors: string[] = [];

        Array.from(fileList).forEach(file => {
            // Check file type
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                errors.push(`${file.name}: Not a PDF`);
                return;
            }

            // Check file size
            const maxBytes = maxSizeMB * 1024 * 1024;
            if (file.size > maxBytes) {
                errors.push(`${file.name}: Exceeds ${maxSizeMB}MB limit`);
                return;
            }

            validFiles.push(file);
        });

        if (errors.length > 0) {
            setError(errors[0]); // Just show first error for now
        }

        if (validFiles.length > 0) {
            onFilesSelect(validFiles);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files.length > 0) {
            validateAndProcessFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndProcessFiles(e.target.files);
        }
        // Reset input value to allow selecting same files again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="w-full">
            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative border-4 border-dashed rounded-2xl p-12 text-center cursor-pointer
                    transition-all duration-300 ease-out
                    ${isDragging
                        ? 'border-black bg-gray-100 scale-[1.02]'
                        : 'border-gray-300 hover:border-black hover:bg-gray-50'
                    }
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                />

                {/* Icon */}
                <div className={`
                    mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isDragging ? 'bg-black text-white scale-110' : 'bg-gray-100'}
                `}>
                    <svg
                        className="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>

                {/* Text */}
                <h3 className="text-xl font-black mb-2">
                    {label}
                </h3>
                <p className="text-gray-500">
                    Click to browse or drop multiple files
                </p>

                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 rounded-2xl bg-black/5 flex items-center justify-center">
                        <span className="text-2xl font-black">Drop them!</span>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 font-medium">
                    {error}
                </div>
            )}
        </div>
    );
}
