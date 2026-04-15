// ─────────────────────────────────────────────────────────────────────────────
// main.js  –  Einstiegspunkt der Svelte-Anwendung
//
// Diese Datei ist bewusst kurz: Sie importiert die Wurzel-Komponente (App.svelte)
// und "mountet" sie in das <div id="app"> aus index.html.
//
// Svelte-Konzept: Eine Anwendung besteht aus einem Baum von Komponenten.
// App.svelte ist die Wurzel; sie kann beliebig viele Kind-Komponenten enthalten.
// ─────────────────────────────────────────────────────────────────────────────

import App from './App.svelte';

const app = new App({
  // target: Das DOM-Element, in das Svelte die App rendert
  target: document.getElementById('app'),
});

export default app;
