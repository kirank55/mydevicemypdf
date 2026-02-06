import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <>
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <span className="badge badge-success my-5">
                        🔒Your Files Never Leave Your Device
                    </span>
                    <h1 className="hero-title">
                        PDF Tools That <span className="hero-title-accent">Respect</span> Your Privacy
                    </h1>
                    <p className="hero-subtitle">
                        Compress, split, and merge PDFs directly in your browser.
                        No uploads, no servers, no tracking — just pure client-side processing.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/compress" className="btn btn-primary">
                            Start Compressing
                        </Link>
                        <Link to="/split" className="btn btn-secondary">
                            Split a PDF
                        </Link>
                    </div>
                </div>
            </section>

            {/* Tools Section */}
            <section className="tools-section">
                <div className="container">
                    <h2 className="section-title">Choose Your Tool</h2>
                    <div className="tools-grid">
                        <Link to="/compress" className="card tool-card">
                            <div className="tool-icon">📦</div>
                            <h3>Compress</h3>
                            <p>Reduce file size by optimizing images within your PDF.</p>
                            <span className="btn btn-secondary">Compress PDF</span>
                        </Link>

                        <Link to="/split" className="card tool-card">
                            <div className="tool-icon">✂️</div>
                            <h3>Split</h3>
                            <p>Extract specific pages or split into multiple documents.</p>
                            <span className="btn btn-secondary">Split PDF</span>
                        </Link>

                        <Link to="/merge" className="card tool-card">
                            <div className="tool-icon">🔗</div>
                            <h3>Merge</h3>
                            <p>Combine multiple PDFs into a single document.</p>
                            <span className="btn btn-secondary">Merge PDFs</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="trust-section">
                <div className="container">
                    <h2 className="section-title">Why Choose Us?</h2>
                    <div className="trust-grid">
                        <div className="trust-item">
                            <div className="trust-icon">🔐</div>
                            <h4>Zero Data Collection</h4>
                            <p>Your files are processed entirely in your browser. We never see them.</p>
                        </div>

                        <div className="trust-item">
                            <div className="trust-icon">⚡</div>
                            <h4>Lightning Fast</h4>
                            <p>No upload wait times. Processing happens instantly on your device.</p>
                        </div>

                        <div className="trust-item">
                            <div className="trust-icon">🌐</div>
                            <h4>Works Offline</h4>
                            <p>Once loaded, the app works without an internet connection.</p>
                        </div>

                        <div className="trust-item">
                            <div className="trust-icon">💯</div>
                            <h4>Free Forever</h4>
                            <p>No subscriptions, no limits, no hidden costs.</p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
