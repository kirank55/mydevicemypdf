import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // The @jspawn packages ship .mjs wrappers that rely on a globalThis.exports
      // side-effect chain which Vite's esbuild pre-bundler breaks. Alias directly
      // to the CJS .js entry files so esbuild uses its standard module.exports
      // conversion instead.
      '@jspawn/ghostscript-wasm': resolve(__dirname, 'node_modules/@jspawn/ghostscript-wasm/gs.js'),
      '@jspawn/qpdf-wasm': resolve(__dirname, 'node_modules/@jspawn/qpdf-wasm/qpdf.js'),
    },
  },
})
