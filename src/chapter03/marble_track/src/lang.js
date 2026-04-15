// ─────────────────────────────────────────────────────────────────────────────
// lang.js  –  Alle anzeigbaren Texte des Applets, in zwei Sprachen
//
// Verwendung in App.svelte:
//   import { de as t } from './lang.js';   // Deutsch  ← aktiv
//   import { en as t } from './lang.js';   // Englisch ← einfach austauschen
//
// Konvention: 't' steht für "translations" – kurz, leicht zu tippen.
//
// ── Was gehört hierher? ──────────────────────────────────────────────────────
//
//   ✓  Titel, Beschreibungen, Button-Labels, Achsentitel
//   ✓  Abschnittsbezeichnungen, Formeln in lesbarer Darstellung
//   ✓  Fußnotentext, Hinweise
//
//   ✗  Zahlen (0.25, 24, 8 ...) → sie sind sprachunabhängig, bleiben in App.svelte
//   ✗  Logik, Berechnungen       → ebenfalls in App.svelte
//   ✗  CSS-Farben                → ebenfalls in App.svelte
//
// ── Warum nicht JSON? ────────────────────────────────────────────────────────
//
//   JSON kann keine mehrzeiligen Strings, keine Kommentare und keinen Code.
//   Als ES-Modul (.js) können wir Strings über mehrere Zeilen aufteilen,
//   Kommentare schreiben, und später sogar Funktionen einbauen (z. B. für
//   pluralisierende Texte wie "1 Abschnitt" vs. "3 Abschnitte").
// ─────────────────────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════════════
// DEUTSCH
// ════════════════════════════════════════════════════════════════════════════
export const de = {

  // ── Kopfzeile ──────────────────────────────────────────────────────────────
  title:    'Applet Kugelbahn – Abschnittsweise Funktion',
  subtitle: 'Die Kugelbahn besteht aus drei Abschnitten: zwei Gefällen und einem Plateau. '
          + 'Trotzdem ist die Gesamtbahn eine Funktion – denn jedem Ort x wird '
          + 'genau eine Höhe h(x) zugeordnet.',

  // ── Schaltflächen ──────────────────────────────────────────────────────────
  // Vier Zustände des primären Buttons → alle hier definiert,
  // damit App.svelte nur noch 't.btnStart' etc. schreibt.
  btnStart:   '▶ Kugel starten',
  btnPause:   '⏸ Pause',
  btnRestart: '▶ Nochmals starten',
  btnReset:   '↺ Zurücksetzen',
  hint:       'Kugel ist per Maus oder Touch verschiebbar',

  // ── Achsentitel & Einheiten ────────────────────────────────────────────────
  unitX:  'Position x [cm]',
  unitH:  'Höhe h(x) [cm]',
  unitDf: 'h′(x)',            // Ableitungssymbol in der Info-Kachel

  // ── Info-Kacheln ───────────────────────────────────────────────────────────
  labelPosition: 'Position',
  labelHeight:   'Höhe',
  labelSlope:    'Steigung',
  labelSection:  'Abschnitt',

  // ── Abschnittsbeschriftungen ───────────────────────────────────────────────
  // Reihenfolge entspricht exakt dem SECTIONS-Array in App.svelte.
  // Formeln hier: menschenlesbare Darstellung (Punkt als Dezimalzeichen).
  sections: [
    {
      svgLabel:   'Gefälle 1',                  // Kurzlabel im Diagramm
      badgeLabel: 'Abschnitt 1: Gefälle',        // Badge unterhalb des Diagramms
      badgeSub:   'h′ = −0.25',                  // Steigung als Hinweis
      formula:    '−0.25 · x + 6',               // Formel in der Info-Kachel
    },
    {
      svgLabel:   'Plateau',
      badgeLabel: 'Abschnitt 2: Plateau',
      badgeSub:   'h′ = 0',
      formula:    'h(x) = 4',
    },
    {
      svgLabel:   'Gefälle 2',
      badgeLabel: 'Abschnitt 3: steileres Gefälle',
      badgeSub:   'h′ = −1/3',
      formula:    '−(1/3) · x + 8',
    },
  ],

  // ── Fußzeile ───────────────────────────────────────────────────────────────
  footer: 'Kernidee: Auch eine abschnittsweise definierte Kurve ist eine Funktion, '
        + 'solange jedem x-Wert genau ein h(x)-Wert zugeordnet wird.',
};


// ════════════════════════════════════════════════════════════════════════════
// ENGLISCH
// ════════════════════════════════════════════════════════════════════════════
// Gleiche Schlüssel, andere Werte. In App.svelte genügt:
//   import { en as t } from './lang.js';
export const en = {

  title:    'Applet Marble Track – Piecewise Function',
  subtitle: 'The marble track consists of three sections: two slopes and one plateau. '
          + 'Yet the entire track is a function – because every position x '
          + 'maps to exactly one height h(x).',

  btnStart:   '▶ Start marble',
  btnPause:   '⏸ Pause',
  btnRestart: '▶ Start again',
  btnReset:   '↺ Reset',
  hint:       'Marble can be dragged with mouse or touch',

  unitX:  'Position x [cm]',
  unitH:  'Height h(x) [cm]',
  unitDf: 'h′(x)',

  labelPosition: 'Position',
  labelHeight:   'Height',
  labelSlope:    'Slope',
  labelSection:  'Section',

  sections: [
    {
      svgLabel:   'Slope 1',
      badgeLabel: 'Section 1: Slope',
      badgeSub:   'h′ = −0.25',
      formula:    '−0.25 · x + 6',
    },
    {
      svgLabel:   'Plateau',
      badgeLabel: 'Section 2: Plateau',
      badgeSub:   'h′ = 0',
      formula:    'h(x) = 4',
    },
    {
      svgLabel:   'Slope 2',
      badgeLabel: 'Section 3: steeper slope',
      badgeSub:   'h′ = −1/3',
      formula:    '−(1/3) · x + 8',
    },
  ],

  footer: 'Key idea: Even a piecewise-defined curve is a function, '
        + 'as long as every x-value maps to exactly one h(x)-value.',
};
