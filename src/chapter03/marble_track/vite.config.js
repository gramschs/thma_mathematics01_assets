// ─────────────────────────────────────────────────────────────────────────────
// vite.config.js
//
// Vite ist das Build-Tool, das aus .svelte-Dateien fertiges JavaScript/CSS
// erzeugt. Hier konfigurieren wir zwei wichtige Dinge:
//
//   1. Das Svelte-Plugin – es lehrt Vite, .svelte-Dateien zu verstehen
//      und in Standard-JavaScript zu übersetzen (kompilieren).
//
//   2. base: './'  – damit alle relativen Pfade im fertigen Build stimmen,
//      egal ob das Applet auf GitHub Pages, in einem Unterordner oder per
//      iframe eingebettet liegt.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vite';
import { svelte }       from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],

  // Relative Pfade im Build → iframe-tauglich
  base: './',

  build: {
    // Ausgabeordner für den fertigen Build (Standard: dist/)
    outDir: 'dist',

    // Eine einzige JS-Datei statt Code-Splitting –
    // vereinfacht das Einbinden per iframe erheblich.
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
