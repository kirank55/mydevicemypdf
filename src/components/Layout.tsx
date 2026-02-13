import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
    return (
        <>
            <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-black tracking-tight">
                        MyDevice<span className="bg-black text-white px-1.5 py-0.5 ml-0.5">MyPDF</span>
                    </Link>
                    <nav className="flex gap-4">
                        <a
                            href="https://github.com/kirank55/mydevicemypdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold uppercase tracking-wide px-2 py-1 border-b-4 border-transparent hover:border-gray-300 transition-colors"
                        >
                            Github
                        </a>
                    </nav>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
            <footer className="mt-auto py-6 bg-black text-white text-center">
                <p className="text-gray-400">
                    <span className="font-bold text-white">MyDeviceMyPDF</span> — Your files never leave your device.
                </p>
                <div className="flex justify-center gap-4 mt-2 text-gray-400 text-sm">
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                        GitHub
                    </a>
                    <span>•</span>
                    <span>100% Browser-Based</span>
                </div>
            </footer>
        </>
    );
}
