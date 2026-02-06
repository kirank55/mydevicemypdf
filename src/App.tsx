import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CompressPage from './pages/CompressPage';

// Placeholder pages for routing
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-black mb-4">{title}</h1>
      <p className="text-gray-500">Coming soon...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="compress" element={<CompressPage />} />
          <Route path="split" element={<ComingSoon title="Split PDF" />} />
          <Route path="merge" element={<ComingSoon title="Merge PDFs" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
