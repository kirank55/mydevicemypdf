interface ProgressIndicatorProps {
    progress: number; // 0-100
    status?: string;
    showPercentage?: boolean;
}

export default function ProgressIndicator({
    progress,
    status = 'Processing...',
    showPercentage = true,
}: ProgressIndicatorProps) {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className="w-full">
            {/* Header with status and percentage */}
            <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg">{status}</span>
                {showPercentage && (
                    <span className="font-black text-xl tabular-nums">
                        {Math.round(clampedProgress)}%
                    </span>
                )}
            </div>

            {/* Progress bar container */}
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                {/* Progress fill */}
                <div
                    className="absolute inset-y-0 left-0 bg-black rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${clampedProgress}%` }}
                />

                {/* Animated stripes for active state */}
                {progress < 100 && progress > 0 && (
                    <div
                        className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
                        style={{ width: `${clampedProgress}%` }}
                    >
                        <div
                            className="w-full h-full opacity-20"
                            style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 20px)',
                                animation: 'progress-stripes 1s linear infinite',
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Completion indicator */}
            {progress >= 100 && (
                <div className="flex items-center gap-2 mt-3 text-green-600 font-bold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>Complete!</span>
                </div>
            )}
        </div>
    );
}
