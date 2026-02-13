import { Link } from 'react-router-dom';
import { Shield, Zap, Globe, Award } from 'lucide-react';

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
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link
                            to="/compress"
                            className="inline-flex items-center px-8 py-4 font-bold uppercase tracking-wide text-black bg-white border-4 border-black rounded-lg hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all"
                        >
                            Compress PDF
                        </Link>
                        <Link
                            to="/merge"
                            className="inline-flex items-center px-8 py-4 font-bold uppercase tracking-wide text-black bg-white border-4 border-black rounded-lg hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all"
                        >
                            Merge PDF
                        </Link>
                        <Link
                            to="/split"
                            className="inline-flex items-center px-8 py-4 font-bold uppercase tracking-wide text-black bg-white border-4 border-black rounded-lg hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#000] active:translate-y-0 active:shadow-none transition-all"
                        >
                            Split PDF
                        </Link>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-16  bg-gray-100">
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
