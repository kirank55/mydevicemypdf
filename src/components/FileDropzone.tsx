import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';

interface FileDropzoneProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSizeMB?: number;
    label?: string;
    selectedFile?: File | null;
}

export default function FileDropzone({
    onFileSelect,
    accept = '.pdf',
    maxSizeMB = 100,
    label = 'Drop your PDF here',
    selectedFile,
}: FileDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Initialize fileName from selectedFile if provided
    if (selectedFile && !fileName) {
        setFileName(`${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
    }

    const validateAndProcessFile = (file: File) => {
        setError(null);

        // Check file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please select a PDF file');
            return;
        }

        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            setError(`File size exceeds ${maxSizeMB}MB limit`);
            return;
        }

        setFileName(`${file.name} (${formatFileSize(file.size)})`);
        onFileSelect(file);
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

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            validateAndProcessFile(files[0]);
        }
    };

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            validateAndProcessFile(files[0]);
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
          ${fileName ? 'bg-gray-50' : ''}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
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
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>

                {/* Text */}
                <h3 className="text-xl font-black mb-2">
                    {fileName || label}
                </h3>
                <p className="text-gray-500">
                    {fileName
                        ? 'Click or drop to replace'
                        : 'or click to browse files'
                    }
                </p>

                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 rounded-2xl bg-black/5 flex items-center justify-center">
                        <span className="text-2xl font-black">Drop it!</span>
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
