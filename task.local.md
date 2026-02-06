# MyDeviceMyPDF - Task Checklist

## 1. Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (`pdf-lib`, `react-router-dom`)
- [x] Create base CSS with black/white bold design system
- [x] Set up routing structure
- [x] Create Layout component with navigation

## 2. Homepage
- [x] Hero section with privacy-first messaging
- [x] Tool cards grid (Compress, Split, Merge)
- [x] Trust indicators section
- [x] Footer with app info

## 3. Compress Page
- [ ] FileDropzone component for PDF upload
- [ ] Compression quality selector
- [ ] ProgressIndicator during processing
- [ ] PDF compression logic using Canvas API + Web Worker
- [ ] Before/after size comparison display
- [ ] Download compressed PDF button

## 4. Split Page
- [ ] FileDropzone for single PDF upload
- [ ] Page range input (e.g., "1-3, 5, 7-10")
- [ ] PDF page count display
- [ ] Split logic using pdf-lib
- [ ] Download individual pages or as ZIP

## 5. Merge Page
- [ ] Multi-file upload dropzone
- [ ] Draggable file reorder list
- [ ] Merge logic using pdf-lib
- [ ] Download merged PDF button
