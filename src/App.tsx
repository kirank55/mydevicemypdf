import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CompressPage from './pages/CompressPage';
import SplitPage from './pages/SplitPage';
import MergePage from './pages/MergePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="compress" element={<CompressPage />} />
          <Route path="split" element={<SplitPage />} />
          <Route path="merge" element={<MergePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
