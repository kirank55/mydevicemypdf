import { useState } from 'react';
import FileDropzone from '../components/FileDropzone';
import ProgressIndicator from '../components/ProgressIndicator';
import ToolPageTemplate from '../components/ToolPageTemplate';
import { protectPdf, downloadBlob } from '../lib/pdf-security';
import { Eye, EyeOff } from 'lucide-react';

export default function ProtectPdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [permissions, setPermissions] = useState({ printing: true, copying: false, modifying: false });
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const togglePermission = (key: keyof typeof permissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleProtect = async () => {
        if (!file || !password) return;
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 1) {
            setError('Password is required.');
            return;
        }
        setIsProcessing(true);
        setProgress(20);
        setError(null);
        try {
            setProgress(50);
            const blob = await protectPdf(file, { userPassword: password, permissions });
            setProgress(100);
            setResult(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to protect PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.pdf$/i, '');
        downloadBlob(result, `${baseName}_protected.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setPassword('');
        setConfirmPassword('');
        setResult(null);
        setError(null);
        setProgress(0);
    };

    return (
        <ToolPageTemplate title="Protect PDF" description="Add password protection to your PDF.">
            {!file && <FileDropzone onFileSelect={setFile} label="Drop your PDF here" />}

            {file && !result && !isProcessing && (
                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 border-4 border-gray-200 rounded-lg space-y-4">
                        <p className="font-bold text-gray-600">{file.name}</p>

                        {/* Password */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 font-bold border-4 border-black rounded-lg pr-12"
                                    placeholder="Enter password"
                                />
                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-3 font-bold border-4 rounded-lg ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-black'
                                    }`}
                                placeholder="Confirm password"
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-red-500 text-sm font-bold mt-1">Passwords do not match</p>
                            )}
                        </div>

                        {/* Permissions */}
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Permissions</label>
                            <div className="space-y-2">
                                {([
                                    { key: 'printing' as const, label: 'Allow Printing' },
                                    { key: 'copying' as const, label: 'Allow Copying Text' },
                                    { key: 'modifying' as const, label: 'Allow Editing' },
                                ]).map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={permissions[key]}
                                            onChange={() => togglePermission(key)}
                                            className="w-5 h-5 accent-black"
                                        />
                                        <span className="font-bold text-sm">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button onClick={handleReset} className="px-6 py-3 font-bold uppercase tracking-wide border-4 border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Cancel</button>
                        <button
                            onClick={handleProtect}
                            disabled={!password || password !== confirmPassword}
                            className="px-6 py-3 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Protect PDF
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && <ProgressIndicator progress={progress} status="Encrypting PDF..." />}

            {error && (
                <div className="p-4 bg-red-50 border-4 border-red-500 rounded-lg">
                    <p className="font-bold text-red-600">{error}</p>
                    <button onClick={() => setError(null)} className="mt-2 text-sm font-bold uppercase tracking-wide text-red-600 hover:underline">Dismiss</button>
                </div>
            )}

            {result && (
                <div className="text-center p-8 bg-green-50 border-4 border-green-500 rounded-lg">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="text-2xl font-black mb-2">PDF Protected!</h3>
                    <p className="text-gray-600 mb-6">Your PDF is now password-protected.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleDownload} className="px-8 py-4 font-bold uppercase tracking-wide text-white bg-black border-4 border-black rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all">Download PDF</button>
                        <button onClick={handleReset} className="px-8 py-4 font-bold uppercase tracking-wide border-4 border-black rounded-lg hover:bg-gray-100 transition-all">Process Another</button>
                    </div>
                </div>
            )}
        </ToolPageTemplate>
    );
}
