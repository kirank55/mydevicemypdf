import { Outlet, Link, NavLink } from 'react-router-dom';

export default function Layout() {
    return (
        <>
            <header className="header">
                <div className="container header-content">
                    <Link to="/" className="logo">
                        MyDevice<span>MyPDF</span>
                    </Link>
                    <nav className="nav">
                        <NavLink
                            to="/compress"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            Compress
                        </NavLink>
                        <NavLink
                            to="/split"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            Split
                        </NavLink>
                        <NavLink
                            to="/merge"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            Merge
                        </NavLink>
                    </nav>
                </div>
            </header>
            <main>
                <Outlet />
            </main>
            <footer className="footer">
                <div className="container">
                    <p><strong>MyDeviceMyPDF</strong> — Your files never leave your device.</p>
                    <div className="footer-links">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <span>•</span>
                        <span>100% Browser-Based</span>
                    </div>
                </div>
            </footer>
        </>
    );
}
