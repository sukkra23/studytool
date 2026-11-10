import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

// jsPDF lazily imports these only for its html()/svg features, which this app
// never uses. Aliasing them to an empty stub keeps the single-file bundle small.
const stub = fileURLToPath(new URL('./src/lib/emptyStub.ts', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      html2canvas: stub,
      dompurify: stub,
      canvg: stub,
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
});
