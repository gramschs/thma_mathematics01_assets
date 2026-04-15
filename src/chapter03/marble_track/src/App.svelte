<!--
  ═══════════════════════════════════════════════════════════════════════════════
  App.svelte  –  Kugelbahn: Abschnittsweise definierte Funktion
  ═══════════════════════════════════════════════════════════════════════════════

  Neue Svelte-Konzepte in dieser Datei (über das Sekante-Applet hinaus):

    import { de as t }    → i18n-Pattern: eine Zeile = Sprachwechsel
    bind:this={svgEl}     → JS-Referenz auf ein DOM-Element
    <svelte:window>       → globale Event-Listener (nötig für Drag)
    style:cursor={...}    → reaktive Inline-CSS-Properties
    class:active={...}    → reaktive CSS-Klassen
    onMount-Cleanup       → Animations-Frame beim Unmounten abbrechen

  Zum Vergleich mit dem Canvas-Ansatz:
    Alt: Jede Änderung → render() aufrufen → ctx.clearRect → alles neu zeichnen
    Neu: Jede Änderung → Svelte erkennt sie → nur betroffene SVG-Attribute werden
         aktualisiert. Kein render(), kein imperatives DOM-Manipulieren.

  Für das einfache Applet (gerade schiefe Ebene):
    Nur SECTIONS auf einen einzigen Eintrag reduzieren, den Rest unverändert lassen.
  ═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  // ── Svelte-Importe ────────────────────────────────────────────────────────
  import { onMount } from 'svelte';

  // ── i18n: eine Zeile für den Sprachwechsel ────────────────────────────────
  // 'de as t' = importiere 'de' aus lang.js und nenne es hier lokal 't'.
  // Für Englisch: 'de' durch 'en' ersetzen – sonst nichts ändern.
  // Das 't' (für "translations") taucht dann überall im Template auf.
  import { de as t } from './lang.js';

  // ════════════════════════════════════════════════════════════════════════════
  // MATHEMATIK (sprachunabhängig, gehört NICHT in lang.js)
  // ════════════════════════════════════════════════════════════════════════════

  const X_MIN = 0,  X_MAX = 24;
  const Y_MIN = 0,  Y_MAX = 8;

  // Abschnittsdaten: reine Mathematik, keine Texte.
  // Die parallelen Texte kommen aus t.sections[i] – gleiche Reihenfolge.
  //
  // gradId verweist auf die <radialGradient id="..."> im SVG-Template.
  // Durch die Namensgebung gradA/B/C bleibt die Kopplung explizit und lesbar.
  const SECTIONS = [
    {
      xFrom: 0,   xTo: 8,
      f:   x => -0.25 * x + 6,
      df:  _  => -0.25,          // Konstante Ableitung (keine Abhängigkeit von x)
      color:  '#005A94',
      gradId: 'gradA',
    },
    {
      xFrom: 8,   xTo: 12,
      f:   _  => 4.0,
      df:  _  => 0,
      color:  '#27ae60',
      gradId: 'gradB',
    },
    {
      xFrom: 12,  xTo: 24,
      f:   x => -(1 / 3) * x + 8,
      df:  _  => -(1 / 3),
      color:  '#d35400',
      gradId: 'gradC',
    },
  ];

  // Hilfsfunktionen: Wert der Funktion / Ableitung an Stelle x ──────────────
  // find() gibt den ersten Abschnitt zurück, für den x ≤ xTo gilt.
  // ?? SECTIONS.at(-1) ist ein Fallback, falls x exakt auf dem rechten Rand liegt.
  const getSection  = x => SECTIONS.find(s => x <= s.xTo + 1e-9) ?? SECTIONS.at(-1);
  const getSectionI = x => {
    const i = SECTIONS.findIndex(s => x <= s.xTo + 1e-9);
    return i === -1 ? SECTIONS.length - 1 : i;
  };
  const evalF  = x => getSection(x).f(x);
  const evalDf = x => getSection(x).df(x);

  // ════════════════════════════════════════════════════════════════════════════
  // SVG-KOORDINATENSYSTEM
  // ════════════════════════════════════════════════════════════════════════════

  const VW = 600, VH = 340;
  const PAD = { top: 28, right: 25, bottom: 52, left: 62 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // Mathematische Koordinaten → SVG-Pixel (y-Achse gespiegelt wie beim Sekante-Applet)
  const toSvgX = x => PAD.left + (x - X_MIN) / (X_MAX - X_MIN) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  // ── Vorberechnete Kurvenpoints ────────────────────────────────────────────
  // Diese ändern sich NIE → kein $:, sondern einmalige Berechnung.
  // $: wäre hier falsch: es würde unnötig reaktive Abhängigkeiten erzeugen.
  // Bewusste Entscheidung: Konstantes einmal berechnen, Veränderliches reaktiv.
  SECTIONS.forEach(sec => {
    const steps = 80;
    sec.points = Array.from({ length: steps + 1 }, (_, i) => {
      const x = sec.xFrom + (sec.xTo - sec.xFrom) * i / steps;
      return `${toSvgX(x).toFixed(1)},${toSvgY(sec.f(x)).toFixed(1)}`;
    }).join(' ');
  });

  // ── Tick-Werte für Achsenbeschriftungen ───────────────────────────────────
  function ticks(min, max, step) {
    const result = [];
    for (let v = min; v <= max + 1e-9; v += step) result.push(+v.toFixed(6));
    return result;
  }
  const xTicks = ticks(X_MIN, X_MAX, 2);
  const yTicks = ticks(Y_MIN, Y_MAX, 1);

  // ════════════════════════════════════════════════════════════════════════════
  // REAKTIVER ZUSTAND
  // ════════════════════════════════════════════════════════════════════════════
  // Nur drei echte Zustandsvariablen – alles andere ist $:-Ableitung.
  // Das ist das Ziel: minimalen Zustand, maximale Ableitungen.

  let ballT       = 0;      // Normalisierte Position: 0 (links) … 1 (rechts)
  let isAnimating = false;
  let isDragging  = false;
  let animId;               // Handle für cancelAnimationFrame()

  // ════════════════════════════════════════════════════════════════════════════
  // REAKTIVE ABLEITUNGEN ($:)
  // ════════════════════════════════════════════════════════════════════════════
  //
  // Vergleich mit dem alten Canvas-Code:
  //   Alt:  this.ballPosition = 0.5;  →  this.render();  →  drawBall() liest alles neu
  //   Neu:  ballT = 0.5;              →  Svelte erkennt die Änderung automatisch
  //                                   →  nur die betroffenen $:-Blöcke werden neu berechnet
  //                                   →  nur die betroffenen SVG-Attribute werden gesetzt
  //
  // Svelte analysiert zur Compile-Zeit, von welchen Variablen jeder $:-Block abhängt.
  // Der Compiler erzeugt dann chirurgisch minimale Updates – kein Virtual DOM, kein Diff.

  $: curX     = X_MIN + ballT * (X_MAX - X_MIN);  // mathematisches x
  $: curY     = evalF(curX);                        // Funktionswert h(x)
  $: ballSvgX = toSvgX(curX);                       // SVG-Pixel x
  $: ballSvgY = toSvgY(curY);                       // SVG-Pixel y
  $: slope    = evalDf(curX);                        // Steigung h'(x)
  $: si       = getSectionI(curX);                  // Abschnittsindex (0, 1, 2)
  $: curSec   = SECTIONS[si];                       // Aktiver SECTIONS-Eintrag
  $: curLang  = t.sections[si];                     // Zugehörige Texte aus lang.js

  // Button-Label: hängt von zwei Variablen ab → $: passt perfekt.
  // Svelte löst diese Abhängigkeit automatisch auf.
  $: btnLabel = isAnimating ? t.btnPause
              : ballT >= 1  ? t.btnRestart
              :               t.btnStart;

  // Steigung formatiert: '-' (Minus-Bindestrich) → '−' (echtes Minuszeichen)
  $: slopeDisplay = slope.toFixed(3).replace('-', '−');

  // Farbe der Steigungsanzeige: rot bei Gefälle, grün beim Anstieg, grau bei Null
  $: slopeColor = slope < -0.005 ? '#c0392b'
               : slope >  0.005 ? '#27ae60'
               : '#888';

  // ════════════════════════════════════════════════════════════════════════════
  // ANIMATION
  // ════════════════════════════════════════════════════════════════════════════

  const SPEED = 0.003;  // Pro Frame (~60 fps → ca. 5.5 Sekunden Laufzeit)

  function startAnimation() {
    if (isAnimating) return;
    if (ballT >= 1) ballT = 0;   // Am Ende: wieder von vorne
    isAnimating = true;

    function step() {
      // Zuweisung an ballT → Svelte registriert die Änderung →
      // alle $:-Blöcke, die von ballT (oder davon abgeleiteten Variablen) abhängen,
      // werden neu berechnet → SVG-Attribute automatisch aktualisiert.
      // Kein this.render() nötig – das ist der fundamentale Unterschied.
      ballT = Math.min(1, ballT + SPEED);

      if (ballT < 1) {
        animId = requestAnimationFrame(step);
      } else {
        isAnimating = false;  // Svelte-Zuweisung → $: btnLabel aktualisiert sich
      }
    }
    animId = requestAnimationFrame(step);
  }

  function stopAnimation() {
    isAnimating = false;
    cancelAnimationFrame(animId);
  }

  function reset() {
    stopAnimation();
    ballT = 0;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DRAG & DROP  –  Pointer Events
  // ════════════════════════════════════════════════════════════════════════════
  //
  // Warum Pointer Events statt getrennter Mouse/Touch-Events?
  //   Pointer Events sind eine einheitliche API, die Mouse, Touch und Stift
  //   zusammenfasst. Ein Handler reicht für alle Eingabegeräte.
  //
  // setPointerCapture(id):
  //   Bindet alle weiteren Pointer-Events an das Element, auch wenn der Zeiger
  //   das Element verlässt. Perfekt für Drag: die Kugel "hält" den Zeiger.
  //
  // Warum <svelte:window on:pointermove>?
  //   Würden wir on:pointermove nur auf die Kugel legen, funktioniert Drag
  //   nur, wenn der Zeiger immer auf der Kugel bleibt. Mit setPointerCapture
  //   auf der Kugel könnten wir es alternativ dort halten – aber die
  //   <svelte:window>-Variante ist expliziter und besser lesbar:
  //   "Globale Bewegung interessiert mich nur, wenn isDragging true ist."

  let svgEl;  // bind:this={svgEl} im Template füllt diese Variable.
              // Wir brauchen svgEl für getBoundingClientRect() in handlePointerMove.

  function handleBallPointerDown(e) {
    stopAnimation();
    isDragging = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();  // Verhindert Text-Selektion bei Mouse-Drag
  }

  function handleWindowPointerMove(e) {
    if (!isDragging) return;
    // getBoundingClientRect() gibt uns die tatsächliche Position des SVG im Viewport.
    // VW / rect.width ist der Skalierungsfaktor: das SVG ist responsiv (100% Breite),
    // die Koordinaten im viewBox aber immer 0–600.
    const rect = svgEl.getBoundingClientRect();
    const svgX  = (e.clientX - rect.left) * (VW / rect.width);
    // SVG-x → normalisiertes ballT (geclampt auf [0, 1])
    ballT = Math.max(0, Math.min(1, (svgX - PAD.left) / plotW));
  }

  function handleWindowPointerUp() {
    isDragging = false;
  }

  // ── Lifecycle: Cleanup ────────────────────────────────────────────────────
  // onMount gibt eine Funktion zurück → Svelte ruft sie beim Unmounten auf.
  // Hier: laufenden Animation Frame abbrechen (verhindert Memory Leaks
  // bei SPA-Navigation, wenn die Komponente aus dem DOM entfernt wird).
  onMount(() => {
    return () => cancelAnimationFrame(animId);
  });
</script>

<!-- ══════════════════════════════════════════════════════════════════════════
     GLOBALE EVENT-LISTENER
     ══════════════════════════════════════════════════════════════════════════
     <svelte:window> ist ein spezielles Svelte-Element, das das Browser-window
     repräsentiert. Svelte entfernt diese Listener automatisch beim Unmounten –
     kein manuelles removeEventListener() nötig.
     ══════════════════════════════════════════════════════════════════════════ -->
<svelte:window
  on:pointermove={handleWindowPointerMove}
  on:pointerup={handleWindowPointerUp}
/>

<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->
<div class="applet">

  <!-- ── Kopfzeile ───────────────────────────────────────────────────────── -->
  <header>
    <h1>{t.title}</h1>
    <p>{t.subtitle}</p>
  </header>

  <!-- ── SVG-Diagramm ────────────────────────────────────────────────────── -->
  <!--
    bind:this={svgEl}: Svelte füllt die Variable svgEl mit der Referenz auf
    dieses DOM-Element, sobald es gemountet wird. Anders als document.getElementById()
    ist diese Referenz Svelte-intern und wird sauber aufgeräumt.
  -->
  <div class="chart-wrap">
    <svg bind:this={svgEl}
         viewBox="0 0 {VW} {VH}"
         preserveAspectRatio="xMidYMid meet"
         role="img"
         aria-label={t.title}>

      <defs>
        <!--
          Drei radiale Farbverläufe, einer pro Abschnitt.
          cx="35%" cy="30%" simuliert eine Lichtquelle oben-links → 3D-Effekt.
          Die Kugel referenziert den aktiven Verlauf via fill="url(#gradA)" etc.
          curSec.gradId ist reaktiv ($:) → Farbwechsel beim Abschnittswechsel
          ist automatisch, ohne zusätzlichen Code.
        -->
        <radialGradient id="gradA" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stop-color="#6ab4d8"/>
          <stop offset="55%"  stop-color="#005A94"/>
          <stop offset="100%" stop-color="#002f52"/>
        </radialGradient>
        <radialGradient id="gradB" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stop-color="#7de0a6"/>
          <stop offset="55%"  stop-color="#27ae60"/>
          <stop offset="100%" stop-color="#145a32"/>
        </radialGradient>
        <radialGradient id="gradC" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stop-color="#f0a070"/>
          <stop offset="55%"  stop-color="#d35400"/>
          <stop offset="100%" stop-color="#6e2c00"/>
        </radialGradient>

        <filter id="ballShadow" x="-40%" y="-40%" width="180%" height="220%">
          <feDropShadow dx="1" dy="3" stdDeviation="3"
                        flood-color="#000" flood-opacity="0.22"/>
        </filter>
      </defs>

      <!-- ── Abschnitts-Hintergründe ─────────────────────────────────────── -->
      <!--
        {#each SECTIONS as sec, i}: i ist der Index.
        Drei leicht eingefärbte Rechtecke – je 5% Deckkraft.
        Die Farbe kommt aus sec.color (in SECTIONS definiert, nicht in lang.js).
      -->
      {#each SECTIONS as sec}
        <rect
          x={toSvgX(sec.xFrom)} y={PAD.top}
          width={toSvgX(sec.xTo) - toSvgX(sec.xFrom)} height={plotH}
          fill={sec.color} opacity="0.05"
        />
      {/each}

      <!-- ── Gitterlinien ─────────────────────────────────────────────────── -->
      {#each xTicks as tx}
        <line x1={toSvgX(tx)} y1={PAD.top}
              x2={toSvgX(tx)} y2={PAD.top + plotH}
              class="grid-line"/>
      {/each}
      {#each yTicks as ty}
        <line x1={PAD.left}         y1={toSvgY(ty)}
              x2={PAD.left + plotW}  y2={toSvgY(ty)}
              class="grid-line"/>
      {/each}

      <!-- ── Trennlinien zwischen Abschnitten ───────────────────────────── -->
      <!-- Hartcodiert bei x=8 und x=12 – die Breakpoints ändern sich nie. -->
      {#each [8, 12] as xBreak}
        <line x1={toSvgX(xBreak)} y1={PAD.top}
              x2={toSvgX(xBreak)} y2={PAD.top + plotH}
              stroke="#ccc" stroke-width="1" stroke-dasharray="5 3"/>
      {/each}

      <!-- ── Achsen ──────────────────────────────────────────────────────── -->
      <line x1={PAD.left}         y1={toSvgY(Y_MIN)}
            x2={PAD.left + plotW}  y2={toSvgY(Y_MIN)}
            class="axis"/>
      <line x1={toSvgX(X_MIN)} y1={PAD.top}
            x2={toSvgX(X_MIN)} y2={PAD.top + plotH}
            class="axis"/>

      <!-- ── Tick-Beschriftungen ─────────────────────────────────────────── -->
      {#each xTicks as tx}
        {#if tx > X_MIN}
          <text x={toSvgX(tx)} y={PAD.top + plotH + 18}
                class="tick-label" text-anchor="middle">{tx}</text>
        {/if}
      {/each}
      {#each yTicks as ty}
        {#if ty > Y_MIN}
          <text x={PAD.left - 8} y={toSvgY(ty)}
                class="tick-label" text-anchor="end" dominant-baseline="middle">{ty}</text>
        {/if}
      {/each}

      <!-- ── Achsentitel ─────────────────────────────────────────────────── -->
      <!-- t.unitX / t.unitH kommen aus lang.js → automatisch übersetzt -->
      <text x={PAD.left + plotW / 2} y={VH - 5}
            class="axis-title" text-anchor="middle">{t.unitX}</text>
      <text x={14} y={PAD.top + plotH / 2}
            class="axis-title" text-anchor="middle"
            transform="rotate(-90, 14, {PAD.top + plotH / 2})">{t.unitH}</text>

      <!-- ── Abschnitts-Labels im Diagramm ──────────────────────────────── -->
      <!--
        t.sections[i].svgLabel kommt aus lang.js → wird übersetzt.
        Mitte des jeweiligen Abschnitts: (xFrom + xTo) / 2
      -->
      {#each SECTIONS as sec, i}
        <text
          x={(toSvgX(sec.xFrom) + toSvgX(sec.xTo)) / 2}
          y={PAD.top + 18}
          class="section-label" fill={sec.color} text-anchor="middle"
        >{t.sections[i].svgLabel}</text>
      {/each}

      <!-- ── Drei farbige Funktionskurven ───────────────────────────────── -->
      <!-- sec.points wurde einmal vorberechnet (kein $:) – konstant. -->
      {#each SECTIONS as sec}
        <polyline points={sec.points} class="line-func" stroke={sec.color}/>
      {/each}

      <!-- ── Koordinaten-Projektionslinien ──────────────────────────────── -->
      <!--
        KERNUNTERSCHIED zum Canvas-Ansatz – deklarativ statt imperativ:

          Alt (Canvas):
            ctx.beginPath();
            ctx.moveTo(ballX, ballY);
            ctx.lineTo(ballX, axisY);   // ← manuell in drawBall()
            ctx.stroke();

          Neu (Svelte + SVG):
            <line x1={ballSvgX} y1={ballSvgY} x2={ballSvgX} y2={toSvgY(Y_MIN)}/>

        Wir beschreiben WAS gezeichnet wird (Relation), nicht WIE (Prozedur).
        Svelte berechnet nur die geänderten Attribute und patcht das DOM direkt.
      -->
      <line x1={ballSvgX}       y1={ballSvgY}
            x2={ballSvgX}       y2={toSvgY(Y_MIN)}
            class="coord-line"/>
      <line x1={toSvgX(X_MIN)}  y1={ballSvgY}
            x2={ballSvgX}       y2={ballSvgY}
            class="coord-line"/>

      <!-- Marker-Punkte auf den Achsen -->
      <circle cx={ballSvgX}      cy={toSvgY(Y_MIN)} r="4"
              fill="none" stroke={curSec.color} stroke-width="1.5" opacity="0.75"/>
      <circle cx={toSvgX(X_MIN)} cy={ballSvgY}      r="4"
              fill="none" stroke={curSec.color} stroke-width="1.5" opacity="0.75"/>

      <!-- ── Kugelschatten ───────────────────────────────────────────────── -->
      <ellipse cx={ballSvgX + 2} cy={ballSvgY + 17}
               rx="12" ry="3.5"
               fill="rgba(0,0,0,0.17)"
               style="filter: blur(2px)"/>

      <!-- ── Kugel ────────────────────────────────────────────────────────── -->
      <!--
        fill="url(#{curSec.gradId})": Interpolation in Attributen mit {}.
        curSec ist $:-reaktiv → Gradient wechselt beim Abschnittswechsel.

        style:cursor={...}: Svelte-Syntax für reaktive Inline-CSS.
        Äquivalent zu: style="cursor: grabbing" / style="cursor: grab"
        Je nach isDragging-Zustand.

        on:pointerdown: Svelte-Syntax für addEventListener('pointerdown', ...).
        Svelte entfernt diesen Listener beim Unmounten automatisch.
      -->
      <circle
        cx={ballSvgX} cy={ballSvgY} r="13"
        fill="url(#{curSec.gradId})"
        stroke={curSec.color}
        stroke-width="1.2"
        filter="url(#ballShadow)"
        style:cursor={isDragging ? 'grabbing' : 'grab'}
        on:pointerdown={handleBallPointerDown}
      />

      <!-- Glanzpunkt – pointer-events:none damit er kein Drag-Target ist -->
      <circle cx={ballSvgX - 5} cy={ballSvgY - 5} r="4"
              fill="rgba(255,255,255,0.55)" pointer-events="none"/>

    </svg>
  </div>

  <!-- ── Abschnitts-Badges ────────────────────────────────────────────────── -->
  <!--
    class:active={si === i}:
    Svelte-Syntax für bedingte CSS-Klassen.
    Wenn si (reaktiver Index) gleich i ist, wird die Klasse 'active' gesetzt.
    Kein classList.add/remove – Svelte übernimmt das reaktiv.

    style:--c={sec.color}:
    Setzt eine CSS Custom Property pro Badge.
    In der <style>-Sektion können wir dann var(--c) verwenden –
    so wird die Farbe des aktiven Abschnitts zum CSS-API der Komponente.
  -->
  <div class="badges">
    {#each SECTIONS as sec, i}
      <div class="badge" class:active={si === i} style:--c={sec.color}>
        <span class="badge-dot" style:background={sec.color}></span>
        <span class="badge-text">
          {t.sections[i].badgeLabel}
          <span class="badge-sub">{t.sections[i].badgeSub}</span>
        </span>
      </div>
    {/each}
  </div>

  <!-- ── Steuerleiste ─────────────────────────────────────────────────────── -->
  <div class="controls">
    <!--
      {btnLabel}: reaktiv aus isAnimating und ballT.
      Kein manuelles button.textContent = '...' im alten Stil.
    -->
    <button class="btn-primary"
            on:click={() => isAnimating ? stopAnimation() : startAnimation()}>
      {btnLabel}
    </button>
    <button class="btn-secondary" on:click={reset}>
      {t.btnReset}
    </button>
    <span class="hint">{t.hint}</span>
  </div>

  <!-- ── Info-Kacheln ─────────────────────────────────────────────────────── -->
  <!--
    style:color={curSec.color}: Svelte-Syntax, Kurzform für style="color: ..."
    Alle Werte hier sind $:-reaktiv und aktualisieren sich automatisch.
  -->
  <div class="info-bar">
    <div class="info-tile">
      <span class="info-label">{t.labelPosition}</span>
      <span class="info-value" style:color={curSec.color}>{curX.toFixed(2)}</span>
      <span class="info-formula">{t.unitX}</span>
    </div>
    <div class="info-tile">
      <span class="info-label">{t.labelHeight}</span>
      <span class="info-value" style:color={curSec.color}>{curY.toFixed(2)}</span>
      <span class="info-formula">{t.unitH}</span>
    </div>
    <div class="info-tile">
      <span class="info-label">{t.labelSlope}</span>
      <span class="info-value" style:color={slopeColor}>{slopeDisplay}</span>
      <span class="info-formula">{t.unitDf}</span>
    </div>
    <div class="info-tile">
      <span class="info-label">{t.labelSection}</span>
      <span class="info-value" style:color={curSec.color}>{si + 1}</span>
      <!-- curLang.formula kommt aus lang.js – übersetzbar -->
      <span class="info-formula">{curLang.formula}</span>
    </div>
  </div>

  <!-- ── Fußzeile ──────────────────────────────────────────────────────────── -->
  <footer>
    <p>{t.footer}</p>
  </footer>

</div>

<!-- ══════════════════════════════════════════════════════════════════════════
     STYLES  –  Scoped CSS
     ══════════════════════════════════════════════════════════════════════════
     Svelte begrenzt diese Stile automatisch auf diese Komponente.
     Kein Konflikt mit anderen Komponenten, kein BEM-Namensgebung nötig.

     Bewusste Designentscheidung: Identische CSS-Tokens wie im Sekante-Applet
     (--bg, --surface, --border, --font-body, --font-ui) → beide Applets
     sehen aus einem Guss aus.
     ══════════════════════════════════════════════════════════════════════════ -->
<style>
  :root {
    --bg:        #fafaf7;
    --surface:   #ffffff;
    --border:    #ddddd0;
    --text:      #1c1c1a;
    --muted:     #666660;
    --radius:    10px;
    --shadow:    0 3px 16px rgba(0,0,0,.09);
    --font-body: 'Georgia', 'Times New Roman', serif;
    --font-ui:   'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .applet {
    font-family: var(--font-body);
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    max-width: 680px;
    margin: 0 auto;
  }

  /* ── Kopfzeile ───────────────────────────────────────────────────────── */
  header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    background: #f3f4f6;
  }
  header h1 { font-size: 1.1rem; font-weight: normal; letter-spacing: .02em; }
  header p  {
    margin-top: 5px; font-size: .82rem;
    font-family: var(--font-ui); color: var(--muted); line-height: 1.5;
  }

  /* ── SVG-Wrapper ─────────────────────────────────────────────────────── */
  .chart-wrap { padding: 16px 20px 0; background: var(--surface); }
  .chart-wrap svg {
    width: 100%; height: auto; display: block;
    user-select: none;
    touch-action: none;   /* Verhindert Scroll beim Touch-Drag über das Diagramm */
  }

  /* SVG-Element-Stile (Svelte scoped → kein Konflikt mit globalem CSS) */
  .grid-line    { stroke: #e8e8e0; stroke-width: 1; }
  .axis         { stroke: #aaa; stroke-width: 1.5; }
  .tick-label   { font-family: var(--font-ui); font-size: 11px; fill: var(--muted); }
  .axis-title   { font-family: var(--font-ui); font-size: 12px; fill: var(--muted); font-style: italic; }
  .section-label{ font-family: var(--font-ui); font-size: 10px; font-weight: 600; opacity: 0.85; }
  .line-func    { fill: none; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
  .coord-line   { stroke: #aaa; stroke-width: 1; stroke-dasharray: 4 3; opacity: 0.4; }

  /* ── Badges ──────────────────────────────────────────────────────────── */
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .badge {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-family: var(--font-ui);
    font-size: .74rem;
    color: var(--muted);
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    transition: border-color .25s, background .25s;
  }
  /* --c ist die CSS Custom Property, die wir per style:--c={sec.color} setzen */
  .badge.active {
    border-color: var(--c, #ccc);
    background: color-mix(in srgb, var(--c, #888) 10%, transparent);
  }
  .badge-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
  .badge-text { display: flex; flex-direction: column; gap: 1px; }
  .badge-sub  { font-size: .68rem; color: var(--muted); font-style: italic; }

  /* ── Steuerleiste ────────────────────────────────────────────────────── */
  .controls {
    padding: 14px 24px 12px;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    border-top: 1px solid var(--border);
  }
  button {
    font-family: var(--font-ui); font-size: .82rem; padding: 5px 16px;
    border: 1px solid var(--border); border-radius: 4px;
    cursor: pointer; transition: background .15s, border-color .15s;
  }
  .btn-primary   { background: #1a5276; color: #fff; border-color: #1a5276; }
  .btn-primary:hover   { background: #0d3349; }
  .btn-secondary { background: var(--bg); color: var(--text); }
  .btn-secondary:hover { background: #f0ede0; border-color: #bbb; }
  .hint { font-family: var(--font-ui); font-size: .75rem; color: var(--muted); font-style: italic; }

  /* ── Info-Kacheln ────────────────────────────────────────────────────── */
  .info-bar { display: flex; border-top: 1px solid var(--border); background: #f3f4f6; }
  .info-tile {
    flex: 1; padding: 12px 16px;
    display: flex; flex-direction: column; gap: 3px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }
  .info-label {
    font-family: var(--font-ui); font-size: .68rem;
    text-transform: uppercase; letter-spacing: .06em; color: var(--muted);
  }
  .info-value {
    font-family: var(--font-ui); font-size: 1.1rem;
    font-weight: 700; font-variant-numeric: tabular-nums;
  }
  .info-formula { font-family: var(--font-ui); font-size: .7rem; color: var(--muted); }

  /* ── Fußzeile ────────────────────────────────────────────────────────── */
  footer {
    padding: 14px 24px;
    border-top: 1px solid var(--border);
    background: #f3f4f6;
  }
  footer p { font-size: .8rem; font-family: var(--font-ui); color: var(--muted); line-height: 1.6; }
</style>
