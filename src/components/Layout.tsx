import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tight">
            MyDevice
            <span className="bg-black text-white px-1.5 py-0.5 ml-0.5">
              MyPDF
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <a
              href="https://github.com/kirank55/mydevicemypdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold uppercase tracking-wide px-2 py-1 border-b-4 border-transparent hover:border-gray-300 transition-colors"
            >
              Github
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t-2 border-black bg-white">
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
              <a
                href="https://github.com/kirank55/mydevicemypdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold uppercase tracking-wide px-2 py-2 border-l-4 border-transparent hover:border-gray-300 transition-colors"
              >
                Github
              </a>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-auto py-6 bg-black text-white text-center">
        <p className="text-gray-400">
          <span className="font-bold text-white">MyDeviceMyPDF</span> — Your
          files never leave your device.
        </p>
        <div className="flex justify-center gap-4 mt-2 text-gray-400 text-sm">
          <a
            href="https://github.com/kirank55/mydevicemypdf"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span>•</span>
          <span>100% Browser-Based</span>
        </div>
      </footer>
    </>
  );
}
