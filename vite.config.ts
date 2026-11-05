import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained offline page: scripts, styles, fonts and data all inlined.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist',
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    rollupOptions: { input: 'million-fathoms.html' },
  },
});
