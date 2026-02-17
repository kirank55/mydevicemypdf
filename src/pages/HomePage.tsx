import { Link } from 'react-router-dom';
import {
    Shield, Zap, Globe, Award,
    Merge, Scissors, Minimize2, Trash2, GripVertical, RotateCw,
    Image, FileImage,
    Hash, Droplets,
    Lock, Unlock, PenTool, Wrench, FileCheck,
} from 'lucide-react';

const toolCategories = [
    {
        name: 'Organize & Manage',
        tools: [
            { name: 'Merge PDF', route: '/merge-pdf', icon: Merge, description: 'Combine multiple PDFs into one' },
            { name: 'Split PDF', route: '/split-pdf', icon: Scissors, description: 'Separate one PDF into multiple files' },
            { name: 'Remove Pages', route: '/remove-pages', icon: Trash2, description: 'Delete specific pages from a file' },
            { name: 'Organize PDF', route: '/organize-pdf', icon: GripVertical, description: 'Sort, add, and delete PDF pages' },
            { name: 'Rotate PDF', route: '/rotate-pdf', icon: RotateCw, description: 'Rotate pages within a document' },
        ],
    },
    {
        name: 'Optimize & Repair',
        tools: [
            { name: 'Compress PDF', route: '/compress-pdf', icon: Minimize2, description: 'Reduce the file size of your PDF' },
            { name: 'Repair PDF', route: '/repair-pdf', icon: Wrench, description: 'Recover data from a corrupted PDF' },
        ],
    },
    {
        name: 'Convert',
        tools: [
            { name: 'JPG to PDF', route: '/jpg-to-pdf', icon: Image, description: 'Convert images to PDF' },
            { name: 'PDF to JPG', route: '/pdf-to-jpg', icon: FileImage, description: 'Save pages as images' },
            // { name: 'PDF to PDF/A', route: '/convert-pdf-to-pdfa', icon: FileCheck, description: 'Convert to archival format' },
        ],
    },
    {
        name: 'Edit & Security',
        tools: [
            { name: 'Add Page Numbers', route: '/add-pdf-page-number', icon: Hash, description: 'Add numbering to pages' },
            { name: 'Add Watermark', route: '/pdf-add-watermark', icon: Droplets, description: 'Stamp text or images over PDF' },
            // { name: 'Sign PDF', route: '/sign-pdf', icon: PenTool, description: 'Add a digital signature' },
            // { name: 'Protect PDF', route: '/protect-pdf', icon: Lock, description: 'Add password protection' },
            // { name: 'Unlock PDF', route: '/unlock-pdf', icon: Unlock, description: 'Remove password security' },
        ],
    },
];

export default function HomePage() {
    return (
        <>
            {/* Hero Section */}
            <section className="py-16 text-center">
                <div className="max-w-6xl mx-auto px-4">
                    <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold uppercase tracking-widest text-green-600 border-2 border-green-500 rounded-full bg-green-50">
                        Your Files Never Leave Your Device
                    </span>
                    <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
                        PDF Tools That{' '}
                        <span className="inline-block bg-black text-white px-2 -rotate-1">
                            Respect
                        </span>{' '}
                        Your Privacy
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
                        Compress, split, merge, and more — directly in your browser.
                        No uploads, no servers, no tracking.
                    </p>
                </div>
            </section>

            {/* Tool Categories */}
            <section className="py-12">
                <div className="max-w-6xl mx-auto px-4 space-y-16">
                    {toolCategories.map((category) => (
                        <div key={category.name}>
                            <h2 className="text-3xl font-black mb-8 tracking-tight">{category.name}</h2>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {category.tools.map((tool) => (
                                    <Link
                                        key={tool.route}
                                        to={tool.route}
                                        className="group flex items-start gap-4 p-6 bg-white border-4 border-black rounded-lg hover:-translate-y-1 hover:shadow-[0_6px_0_#000] active:translate-y-0 active:shadow-none transition-all"
                                    >
                                        <tool.icon className="w-8 h-8 text-black shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-black text-lg">{tool.name}</h3>
                                            <p className="text-gray-500 text-sm mt-1">{tool.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-16 bg-gray-100">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-4xl font-black text-center mb-12">Why Choose Us?</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                        <div className="p-6">
                            <Shield className="w-12 h-12 mb-4 mx-auto text-black" />
                            <h4 className="text-xl font-black mb-2">Zero Data Collection</h4>
                            <p className="text-gray-500">Your files are processed entirely in your browser. We never see them.</p>
                        </div>
                        <div className="p-6">
                            <Zap className="w-12 h-12 mb-4 mx-auto text-black" />
                            <h4 className="text-xl font-black mb-2">Lightning Fast</h4>
                            <p className="text-gray-500">No upload wait times. Processing happens instantly on your device.</p>
                        </div>
                        <div className="p-6">
                            <Globe className="w-12 h-12 mb-4 mx-auto text-black" />
                            <h4 className="text-xl font-black mb-2">Works Offline</h4>
                            <p className="text-gray-500">Once loaded, the app works without an internet connection.</p>
                        </div>
                        <div className="p-6">
                            <Award className="w-12 h-12 mb-4 mx-auto text-black" />
                            <h4 className="text-xl font-black mb-2">Free Forever</h4>
                            <p className="text-gray-500">No subscriptions, no limits, no hidden costs.</p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
