import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'));
const CompressPage = lazy(() => import('./pages/CompressPage'));
const SplitPage = lazy(() => import('./pages/SplitPage'));
const MergePage = lazy(() => import('./pages/MergePage'));
const RemovePagesPage = lazy(() => import('./pages/RemovePagesPage'));
const RotatePdfPage = lazy(() => import('./pages/RotatePdfPage'));
const OrganizePdfPage = lazy(() => import('./pages/OrganizePdfPage'));
const JpgToPdfPage = lazy(() => import('./pages/JpgToPdfPage'));
const PdfToJpgPage = lazy(() => import('./pages/PdfToJpgPage'));
const AddPageNumbersPage = lazy(() => import('./pages/AddPageNumbersPage'));
const AddWatermarkPage = lazy(() => import('./pages/AddWatermarkPage'));
// const ProtectPdfPage = lazy(() => import('./pages/ProtectPdfPage'));
// const UnlockPdfPage = lazy(() => import('./pages/UnlockPdfPage'));
// const SignPdfPage = lazy(() => import('./pages/SignPdfPage'));
// const PdfToPdfaPage = lazy(() => import('./pages/PdfToPdfaPage'));
// const RepairPdfPage = lazy(() => import('./pages/RepairPdfPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-wide text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />

            {/* Page Manipulation */}
            <Route path="compress-pdf" element={<CompressPage />} />
            <Route path="split-pdf" element={<SplitPage />} />
            <Route path="merge-pdf" element={<MergePage />} />
            <Route path="remove-pages" element={<RemovePagesPage />} />
            <Route path="rotate-pdf" element={<RotatePdfPage />} />
            <Route path="organize-pdf" element={<OrganizePdfPage />} />

            {/* Image Conversion */}
            <Route path="jpg-to-pdf" element={<JpgToPdfPage />} />
            <Route path="pdf-to-jpg" element={<PdfToJpgPage />} />

            {/* Annotations & Metadata */}
            <Route path="add-pdf-page-number" element={<AddPageNumbersPage />} />
            <Route path="pdf-add-watermark" element={<AddWatermarkPage />} />
            {/* <Route path="convert-pdf-to-pdfa" element={<PdfToPdfaPage />} /> */}

            {/* Security */}
            {/* <Route path="protect-pdf" element={<ProtectPdfPage />} /> */}
            {/* <Route path="unlock-pdf" element={<UnlockPdfPage />} /> */}
            {/* <Route path="sign-pdf" element={<SignPdfPage />} /> */}
            {/* <Route path="repair-pdf" element={<RepairPdfPage />} /> */}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
