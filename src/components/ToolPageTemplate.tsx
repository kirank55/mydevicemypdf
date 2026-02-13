import type { ReactNode } from 'react';

interface ToolPageTemplateProps {
    title: string;
    description: string;
    children: ReactNode;
}

export default function ToolPageTemplate({ title, description, children }: ToolPageTemplateProps) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold uppercase tracking-widest text-green-600 border-2 border-green-500 rounded-full bg-green-50">
                    Your Files Never Leave Your Device
                </span>
                <h1 className="text-5xl font-black mb-4">{title}</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    {description}
                </p>
            </div>

            {/* Main content */}
            <div className="space-y-8">
                {children}
            </div>
        </div>
    );
}
