<!--
  ══════════════════════════════════════════════════════════════════════════════
  OptimApp.svelte  –  Constrained optimisation: reduced function A(r)
  After substituting h = 16/r² the surface area becomes a function of one
  variable: A(r) = 2πr² + 32π/r.  Its derivative A'(r) = 4πr − 32π/r²
  vanishes at r = 2 m (the optimum).

  Layout : two-column, no scroll, desktop/tablet (beamer).
  Left   : SVG cylinder (h follows r automatically) + slider r + info-bar.
  Right  : A(r) plot (top, ~65%) and A'(r) plot (bottom, ~35%), both SVG.
           "Show minimum" button annotates r = 2 m on both plots.

  Colour palette (consistent with CylinderApp and SurfaceApp):
    CB  = #005a94  (dark blue)   – curves, axes
    CO  = #e87846  (orange)      – moving point
    CR  = #E60000  (red)         – minimum marker
    CDG = #484949  (dark gray)   – axes, zero line, labels
    CLB = #ccdee9  (light blue)  – cylinder fill
    CY  = #FFEC7F  (yellow)      – A'=0 highlight band
  ══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── Constants ──────────────────────────────────────────────────────────────
  const V0    = 16 * Math.PI;
  const R_OPT = 2.0;
  const H_OPT = 4.0;
  const A_OPT = 24 * Math.PI;   // ≈ 75.398

  // ── Colour tokens ──────────────────────────────────────────────────────────
  const CB  = '#005a94';
  const CO  = '#e87846';
  const CR  = '#E60000';
  const CDG = '#484949';
  const CLB = '#ccdee9';

  // ── Slider range ───────────────────────────────────────────────────────────
  const R_MIN = Math.sqrt(V0 / (Math.PI * 20.0));  // ≈ 0.894
  const R_MAX = 6.0;

  // ── State ──────────────────────────────────────────────────────────────────
  let r           = 2.0;
  let showMinimum = false;

  // ── Derived ────────────────────────────────────────────────────────────────
  $: h     = V0 / (Math.PI * r * r);
  $: A_val = 2 * Math.PI * r * r + 32 * Math.PI / r;
  $: dA_val = 4 * Math.PI * r - 32 * Math.PI / (r * r);

  // ── SVG Cylinder geometry (viewBox 260×320) ────────────────────────────────
  const VB_W = 260; const VB_H = 320;
  const CX   = VB_W / 2;

  const RX_MIN = 18; const RX_MAX = 108;
  const RY_FAC = 0.28;
  const BH_MIN = 12; const BH_MAX = 210;

  $: rx    = RX_MIN + (r    - R_MIN) / (R_MAX - R_MIN) * (RX_MAX - RX_MIN);
  $: ry    = rx * RY_FAC;
  $: bh    = BH_MIN + (h    - 0)     / (20.0  - 0)     * (BH_MAX - BH_MIN);
  $: topY  = (VB_H - bh) / 2;
  $: botY  = topY + bh;
  $: arrX  = CX + rx + 18;
  $: arrRY = topY - ry - 14;

  // ── SVG plot geometry ──────────────────────────────────────────────────────
  // Shared margins
  const PAD = {l: 52, r: 20, t: 16, b: 36};

  // A(r) plot – computed once, reactive width/height via bind
  let wA = 400; let hA = 260;   // defaults, overridden by ResizeObserver
  let wD = 400; let hD = 160;

  $: iWA = Math.max(wA - PAD.l - PAD.r, 10);
  $: iHA = Math.max(hA - PAD.t - PAD.b, 10);
  $: iWD = Math.max(wD - PAD.l - PAD.r, 10);
  $: iHD = Math.max(hD - PAD.t - PAD.b, 10);

  // r axis mapping (shared)
  const R_PLOT_MIN = 0.5; const R_PLOT_MAX = 6.5;
  $: rx2px  = rv => PAD.l + (rv - R_PLOT_MIN) / (R_PLOT_MAX - R_PLOT_MIN) * iWA;
  $: rx2pxD = rv => PAD.l + (rv - R_PLOT_MIN) / (R_PLOT_MAX - R_PLOT_MIN) * iWD;

  // A(r) axis – [50, 320]
  const A_MIN = 50; const A_MAX = 320;
  $: ay2px = av => PAD.t + (1 - (av - A_MIN) / (A_MAX - A_MIN)) * iHA;

  // A'(r) axis – [-80, 80]
  const DA_MIN = -80; const DA_MAX = 80;
  $: day2px = dv => PAD.t + (1 - (dv - DA_MIN) / (DA_MAX - DA_MIN)) * iHD;

  // ── Curve point arrays ─────────────────────────────────────────────────────
  const N_PTS = 200;
  $: curveA = Array.from({length: N_PTS}, (_, i) => {
    const ri = R_PLOT_MIN + (i / (N_PTS - 1)) * (R_PLOT_MAX - R_PLOT_MIN);
    const ai = 2 * Math.PI * ri * ri + 32 * Math.PI / ri;
    return `${rx2px(ri).toFixed(1)},${ay2px(Math.min(Math.max(ai, A_MIN), A_MAX)).toFixed(1)}`;
  }).join(' ');

  $: curveD = Array.from({length: N_PTS}, (_, i) => {
    const ri = R_PLOT_MIN + (i / (N_PTS - 1)) * (R_PLOT_MAX - R_PLOT_MIN);
    const di = 4 * Math.PI * ri - 32 * Math.PI / (ri * ri);
    return `${rx2pxD(ri).toFixed(1)},${day2px(Math.min(Math.max(di, DA_MIN), DA_MAX)).toFixed(1)}`;
  }).join(' ');

  // ── Axis ticks ─────────────────────────────────────────────────────────────
  const r_ticks  = [1, 2, 3, 4, 5, 6];
  const A_ticks  = [50, 100, 150, 200, 250, 300];
  const dA_ticks = [-80, -60, -40, -20, 0, 20, 40, 60, 80];

  // ── ResizeObserver ─────────────────────────────────────────────────────────
  let containerA, containerD;

  onMount(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === containerA) {
          wA = e.contentRect.width;
          hA = e.contentRect.height;
        }
        if (e.target === containerD) {
          wD = e.contentRect.width;
          hD = e.contentRect.height;
        }
      }
    });
    if (containerA) obs.observe(containerA);
    if (containerD) obs.observe(containerD);
    return () => obs.disconnect();
  });
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="app">

  <header>
    <h1>Cylinder optimisation: minimising A(r) = 2&pi;r² + 32&pi;/r</h1>
    <p>
      After substituting h&nbsp;=&nbsp;16/r² the constraint is satisfied
      automatically. Surface area becomes a function of one variable only.
      Setting A'(r)&nbsp;=&nbsp;0 gives the optimum at r&nbsp;=&nbsp;2&nbsp;m.
    </p>
  </header>

  <main>

    <!-- LEFT ────────────────────────────────────────────────────────────────-->
    <section class="left-panel">

      <div class="svg-wrap">
        <svg viewBox="0 0 {VB_W} {VB_H}"
             preserveAspectRatio="xMidYMid meet"
             role="img"
             aria-label="Cylinder with radius r; height h = 16/r² follows automatically">

          <!-- Bottom ellipse -->
          <ellipse cx={CX} cy={botY} rx={rx} ry={ry}
                   fill={CLB} stroke={CB} stroke-width="1.6"/>
          <!-- Body -->
          <rect x={CX - rx} y={topY} width={rx*2} height={bh}
                fill={CLB} stroke="none"/>
          <line x1={CX-rx} y1={topY} x2={CX-rx} y2={botY}
                stroke={CB} stroke-width="1.6"/>
          <line x1={CX+rx} y1={topY} x2={CX+rx} y2={botY}
                stroke={CB} stroke-width="1.6"/>
          <!-- Top ellipse -->
          <ellipse cx={CX} cy={topY} rx={rx} ry={ry}
                   fill={CLB} stroke={CB} stroke-width="1.6"/>

          <!-- Arrowhead markers -->
          <defs>
            <marker id="ah" markerWidth="6" markerHeight="6"
                    refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0.5 L5 3 L0 5.5 Z" fill={CDG}/>
            </marker>
            <marker id="ah2" markerWidth="6" markerHeight="6"
                    refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M5 0.5 L0 3 L5 5.5 Z" fill={CDG}/>
            </marker>
            <marker id="ar" markerWidth="6" markerHeight="6"
                    refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0.5 L5 3 L0 5.5 Z" fill={CDG}/>
            </marker>
          </defs>

          <!-- h arrow -->
          <line x1={arrX} y1={topY} x2={arrX} y2={botY}
                stroke={CDG} stroke-width="1.3"
                marker-start="url(#ah2)" marker-end="url(#ah)"/>
          <text x={arrX+8} y={(topY+botY)/2+4}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="13" font-style="italic" fill={CDG}
                dominant-baseline="middle">h</text>

          <!-- r arrow -->
          <line x1={CX} y1={arrRY} x2={CX+rx} y2={arrRY}
                stroke={CDG} stroke-width="1.3" marker-end="url(#ar)"/>
          <line x1={CX} y1={arrRY-5} x2={CX} y2={arrRY+5}
                stroke={CDG} stroke-width="1.3"/>
          <text x={CX+rx/2} y={arrRY-6}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="13" font-style="italic" fill={CDG}
                text-anchor="middle">r</text>

          <!-- constraint label -->
          <text x={CX} y={VB_H - 8}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="10" fill={CR} text-anchor="middle"
                font-style="italic">h = 16 / r²</text>

        </svg>
      </div>

      <!-- Slider -->
      <div class="controls">
        <div class="slider-row">
          <label for="sl-r">radius <em>r</em></label>
          <input id="sl-r" type="range"
                 min={R_MIN} max={R_MAX} step="0.02"
                 bind:value={r}/>
          <span class="sl-val">{r.toFixed(2)} m</span>
        </div>
        <div class="constraint-note">h = 16/r² = {h.toFixed(2)} m</div>
      </div>

      <!-- Info bar -->
      <div class="info-bar">
        <div class="info-tile">
          <span class="info-lbl">radius r</span>
          <span class="info-val">{r.toFixed(2)} m</span>
        </div>
        <div class="info-tile">
          <span class="info-lbl">height h</span>
          <span class="info-val">{h.toFixed(2)} m</span>
        </div>
        <div class="info-tile">
          <span class="info-lbl">surface area A</span>
          <span class="info-val">{A_val.toFixed(1)} m²</span>
        </div>
        <div class="info-tile">
          <span class="info-lbl">A'(r)</span>
          <span class="info-val"
                style="color:{Math.abs(dA_val) < 1 ? '#1a6b26' : CDG}">
            {dA_val.toFixed(2)}
          </span>
        </div>
      </div>

    </section>

    <!-- RIGHT ───────────────────────────────────────────────────────────────-->
    <section class="right-panel">

      <!-- Top bar with button -->
      <div class="right-header">
        <button class="min-btn" on:click={() => showMinimum = !showMinimum}>
          {showMinimum ? 'hide minimum' : 'show minimum'}
        </button>
      </div>

      <!-- A(r) plot -->
      <div class="plot-wrap" bind:this={containerA}>
        <svg width={wA} height={hA}>

          <!-- y-axis ticks + gridlines -->
          {#each A_ticks as tv}
            <line x1={PAD.l} y1={ay2px(tv)} x2={PAD.l + iWA} y2={ay2px(tv)}
                  stroke="#e8e8e8" stroke-width="1"/>
            <line x1={PAD.l-4} y1={ay2px(tv)} x2={PAD.l} y2={ay2px(tv)}
                  stroke={CDG} stroke-width="1"/>
            <text x={PAD.l-7} y={ay2px(tv)}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CDG} text-anchor="end"
                  dominant-baseline="middle">{tv}</text>
          {/each}

          <!-- x-axis ticks + gridlines -->
          {#each r_ticks as tv}
            <line x1={rx2px(tv)} y1={PAD.t} x2={rx2px(tv)} y2={PAD.t+iHA}
                  stroke="#e8e8e8" stroke-width="1"/>
            <line x1={rx2px(tv)} y1={PAD.t+iHA} x2={rx2px(tv)} y2={PAD.t+iHA+4}
                  stroke={CDG} stroke-width="1"/>
            <text x={rx2px(tv)} y={PAD.t+iHA+14}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CDG} text-anchor="middle">{tv}</text>
          {/each}

          <!-- Axes -->
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+iHA}
                stroke={CDG} stroke-width="1.4"/>
          <line x1={PAD.l} y1={PAD.t+iHA} x2={PAD.l+iWA} y2={PAD.t+iHA}
                stroke={CDG} stroke-width="1.4"/>

          <!-- Axis labels -->
          <text x={PAD.l+iWA/2} y={hA-4}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="11" font-style="italic" fill={CDG}
                text-anchor="middle">r (m)</text>
          <text x="13" y={PAD.t+iHA/2}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="11" fill={CDG} text-anchor="middle"
                transform="rotate(-90 13 {PAD.t+iHA/2})">A (m²)</text>

          <!-- A(r) curve -->
          <polyline points={curveA}
                    fill="none" stroke={CB} stroke-width="2.2"
                    stroke-linejoin="round" stroke-linecap="round"/>

          <!-- Minimum marker -->
          {#if showMinimum}
            <line x1={rx2px(R_OPT)} y1={PAD.t}
                  x2={rx2px(R_OPT)} y2={PAD.t+iHA}
                  stroke={CR} stroke-width="1.8" stroke-dasharray="5,3"/>
            <!-- Annotation box -->
            {@const ax = rx2px(R_OPT)}
            {@const ay = ay2px(A_OPT)}
            <circle cx={ax} cy={ay} r="5"
                    fill={CR} stroke="#fff" stroke-width="1.5"/>
            <rect x={ax+10} y={ay-32} width="148" height="38"
                  fill="white" stroke={CR} stroke-width="1"
                  rx="4" opacity="0.93"/>
            <text x={ax+17} y={ay-18}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CR}>
              r = 2 m,  h = 4 m
            </text>
            <text x={ax+17} y={ay-5}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CR}>
              A = 24&pi; ≈ {A_OPT.toFixed(1)} m²
            </text>
          {/if}

          <!-- Moving point -->
          {#if r >= R_PLOT_MIN && r <= R_PLOT_MAX}
            {@const px = rx2px(r)}
            {@const py = ay2px(Math.min(Math.max(A_val, A_MIN), A_MAX))}
            <circle cx={px} cy={py} r="6"
                    fill={CO} stroke="#fff" stroke-width="1.8"/>
          {/if}

          <!-- Plot title -->
          <text x={PAD.l+iWA/2} y={PAD.t-2}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="11" fill={CDG} text-anchor="middle"
                font-style="italic">
            A(r) = 2&pi;r² + 32&pi;/r
          </text>

        </svg>
      </div>

      <!-- A'(r) plot -->
      <div class="plot-wrap plot-wrap-d" bind:this={containerD}>
        <svg width={wD} height={hD}>

          <!-- y-axis ticks + gridlines -->
          {#each dA_ticks as tv}
            <line x1={PAD.l} y1={day2px(tv)} x2={PAD.l+iWD} y2={day2px(tv)}
                  stroke={tv === 0 ? CDG : '#e8e8e8'}
                  stroke-width={tv === 0 ? 1.4 : 1}
                  stroke-dasharray={tv === 0 ? 'none' : 'none'}/>
            <line x1={PAD.l-4} y1={day2px(tv)} x2={PAD.l} y2={day2px(tv)}
                  stroke={CDG} stroke-width="1"/>
            <text x={PAD.l-7} y={day2px(tv)}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CDG} text-anchor="end"
                  dominant-baseline="middle">{tv}</text>
          {/each}

          <!-- x-axis ticks -->
          {#each r_ticks as tv}
            <line x1={rx2pxD(tv)} y1={PAD.t} x2={rx2pxD(tv)} y2={PAD.t+iHD}
                  stroke="#e8e8e8" stroke-width="1"/>
            <line x1={rx2pxD(tv)} y1={PAD.t+iHD}
                  x2={rx2pxD(tv)} y2={PAD.t+iHD+4}
                  stroke={CDG} stroke-width="1"/>
            <text x={rx2pxD(tv)} y={PAD.t+iHD+14}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CDG} text-anchor="middle">{tv}</text>
          {/each}

          <!-- Axes -->
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+iHD}
                stroke={CDG} stroke-width="1.4"/>
          <line x1={PAD.l} y1={PAD.t+iHD} x2={PAD.l+iWD} y2={PAD.t+iHD}
                stroke={CDG} stroke-width="1.4"/>

          <!-- Axis labels -->
          <text x={PAD.l+iWD/2} y={hD-4}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="11" font-style="italic" fill={CDG}
                text-anchor="middle">r (m)</text>
          <text x="13" y={PAD.t+iHD/2}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="11" fill={CDG} text-anchor="middle"
                transform="rotate(-90 13 {PAD.t+iHD/2})">A' (m)</text>

          <!-- A'(r) curve -->
          <polyline points={curveD}
                    fill="none" stroke={CB} stroke-width="2.2"
                    stroke-linejoin="round" stroke-linecap="round"/>

          <!-- Minimum marker -->
          {#if showMinimum}
            <line x1={rx2pxD(R_OPT)} y1={PAD.t}
                  x2={rx2pxD(R_OPT)} y2={PAD.t+iHD}
                  stroke={CR} stroke-width="1.8" stroke-dasharray="5,3"/>
            <circle cx={rx2pxD(R_OPT)} cy={day2px(0)} r="5"
                    fill={CR} stroke="#fff" stroke-width="1.5"/>
            <text x={rx2pxD(R_OPT)+8} y={day2px(0)-8}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="10" fill={CR}>A'(2) = 0</text>
          {/if}

          <!-- Moving point -->
          {#if r >= R_PLOT_MIN && r <= R_PLOT_MAX}
            {@const px = rx2pxD(r)}
            {@const py = day2px(Math.min(Math.max(dA_val, DA_MIN), DA_MAX))}
            <circle cx={px} cy={py} r="6"
                    fill={CO} stroke="#fff" stroke-width="1.8"/>
          {/if}

          <!-- Plot title -->
          <text x={PAD.l+iWD/2} y={PAD.t-2}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="11" fill={CDG} text-anchor="middle"
                font-style="italic">
            A'(r) = 4&pi;r &minus; 32&pi;/r²
          </text>

        </svg>
      </div>

    </section>

  </main>

</div>


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

  .app {
    color-scheme: light;
    font-family: var(--font-body);
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 800px;
  }

  header {
    padding: 12px 24px 10px;
    border-bottom: 1px solid var(--border);
    background: #f3f4f6;
    flex-shrink: 0;
  }
  header h1 {
    font-size: 1.0rem; font-weight: normal; letter-spacing: .02em;
  }
  header p {
    margin-top: 3px; font-size: .78rem;
    font-family: var(--font-ui); color: var(--muted); line-height: 1.45;
  }

  main {
    display: flex; flex: 1; min-height: 0; overflow: hidden;
  }

  /* ── Left panel ─────────────────────────────────────────────────────────── */
  .left-panel {
    width: 36%;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .svg-wrap {
    flex: 1; min-height: 0;
    display: flex; align-items: center; justify-content: center;
    padding: 8px 16px; background: var(--surface);
  }
  .svg-wrap svg { width: 100%; height: 100%; max-height: 320px; }

  .controls {
    padding: 10px 20px 6px;
    border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;
  }
  .slider-row {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--font-ui); font-size: .82rem;
  }
  .slider-row label { min-width: 72px; color: var(--muted); }
  .slider-row input[type=range] {
    flex: 1; accent-color: #005a94; cursor: pointer; height: 5px;
  }
  .sl-val {
    min-width: 56px; font-weight: 700; font-size: .88rem;
    text-align: right; font-variant-numeric: tabular-nums;
    color: #333; font-family: var(--font-ui);
  }
  .constraint-note {
    font-family: var(--font-ui); font-size: .78rem;
    color: #E60000; font-style: italic;
    font-variant-numeric: tabular-nums;
  }

  .info-bar {
    display: flex; border-top: 1px solid var(--border);
    background: #f3f4f6; flex-shrink: 0;
  }
  .info-tile {
    flex: 1; padding: 8px 8px;
    display: flex; flex-direction: column; gap: 1px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }
  .info-lbl {
    font-family: var(--font-ui); font-size: .62rem;
    color: var(--muted); white-space: nowrap;
  }
  .info-val {
    font-family: var(--font-ui); font-size: .92rem;
    font-weight: 700; font-variant-numeric: tabular-nums;
  }

  /* ── Right panel ─────────────────────────────────────────────────────────── */
  .right-panel {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
    overflow: hidden; background: var(--surface);
  }

  .right-header {
    display: flex; justify-content: flex-end;
    padding: 6px 16px 0; flex-shrink: 0;
  }

  .min-btn {
    padding: 4px 14px; font-family: var(--font-ui); font-size: .82rem;
    color: #E60000; background: transparent;
    border: 1px solid #E60000; border-radius: 6px;
    cursor: pointer; white-space: nowrap;
    transition: background .15s, color .15s;
  }
  .min-btn:hover  { background: #E60000; color: #fff; }
  .min-btn:active { transform: scale(.97); }

  .plot-wrap {
    flex: 1; min-height: 0; min-width: 0;
    border-bottom: 1px solid var(--border);
    overflow: hidden;
  }
  .plot-wrap-d { flex: 0 0 38%; }
  .plot-wrap:last-child { border-bottom: none; }

  .plot-wrap svg { display: block; }
</style>
