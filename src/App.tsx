import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';

// Placeholder pages for routing
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
      <h1>{title}</h1>
      <p style={{ marginTop: '1rem' }}>Coming soon...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="compress" element={<ComingSoon title="Compress PDF" />} />
          <Route path="split" element={<ComingSoon title="Split PDF" />} />
          <Route path="merge" element={<ComingSoon title="Merge PDFs" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
