<!--
  ═══════════════════════════════════════════════════════════════════════════════
  App.svelte  –  App 2: Secant Approaches Tangent
  f(x) = 0.02x² − 0.6x + 6,  x ∈ [0, 30]
  Fixed base point x₀ = 5,  f′(x₀) = 0.04·5 − 0.6 = −0.4
  ═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── Height function & analytical derivative ───────────────────────────────
  const f  = x => 0.02 * x * x - 0.6 * x + 6;
  const df = x => 0.04 * x - 0.6;

  // ── State ─────────────────────────────────────────────────────────────────
  let h  = 5;        // step size, slider [0.01, 10]
  const x0 = 5;     // fixed base point

  // ── SVG viewport ─────────────────────────────────────────────────────────
  const VW = 600;
  const VH = 400;
  const PAD = { top: 20, right: 20, bottom: 50, left: 55 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // ── Math domain ───────────────────────────────────────────────────────────
  const xMin = 0, xMax = 30;
  const yMin = 0, yMax = 8;

  // ── Coordinate transforms ─────────────────────────────────────────────────
  const toSvgX = x => PAD.left + (x - xMin) / (xMax - xMin) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // ── Dense sample for smooth curves ───────────────────────────────────────
  const xs = Array.from({ length: 300 }, (_, i) => xMin + i * (xMax - xMin) / 299);

  function makeLine(xArr, fn) {
    return xArr.map(x => `${toSvgX(x)},${toSvgY(fn(x))}`).join(' ');
  }

  // ── Reactive quantities ───────────────────────────────────────────────────
  $: slope_sek = (f(x0 + h) - f(x0)) / h;
  $: slope_tan = df(x0);                       // = −0.4, constant (x0 fixed)
  $: error     = Math.abs(slope_sek - slope_tan);

  $: slopeDisplay = slope_sek.toFixed(4);
  $: errorDisplay = error.toFixed(4);
  $: tanDisplay   = slope_tan.toFixed(4);

  // Polylines
  $: funcPoints    = makeLine(xs, f);
  $: sekantePoints = makeLine(xs, x => f(x0) + slope_sek * (x - x0));
  $: tanPoints     = makeLine(xs, x => f(x0) + slope_tan * (x - x0));

  // Dot positions
  $: px0 = { x: toSvgX(x0),     y: toSvgY(f(x0)) };
  $: px1 = { x: toSvgX(x0 + h), y: toSvgY(f(x0 + h)) };

  // Error color: red (large) → green (small)  via HSL hue 0→120
  $: errorColor = (() => {
    const maxErr = 0.5;
    const t   = Math.max(0, Math.min(1, 1 - error / maxErr));
    const hue = Math.round(t * 120);
    return `hsl(${hue}, 75%, 36%)`;
  })();

  // ── Axis ticks ────────────────────────────────────────────────────────────
  function ticks(min, max, step) {
    const r = [];
    for (let v = min; v <= max + 1e-9; v += step) r.push(+v.toFixed(6));
    return r;
  }
  const xTicks = ticks(xMin, xMax, 5);
  const yTicks = ticks(yMin, yMax, 1);

  // ── Color constants ───────────────────────────────────────────────────────
  const C_FUNC = '#005a94';   // dark blue  – parabola
  const C_SEK  = '#e60000';   // red        – secant
  const C_TAN  = '#1a8a1a';   // green      – tangent
  const C_PT0  = '#e87846';   // orange     – P₁ (base point)

  // ── Slider bounds ─────────────────────────────────────────────────────────
  const H_MIN  = 0.01;
  const H_MAX  = 10;
  const H_STEP = 0.01;

  onMount(() => {});
</script>

<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App 2 – Secant Approaches Tangent</h1>
    <p>
      Drag the slider to shrink h toward 0. Watch the red secant rotate
      toward the green tangent and the error tile turn green.
    </p>
  </header>

  <!-- SVG chart -->
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Secant approaching the tangent at x₀ = 5">

      <defs>
        <clipPath id="plot-area">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      <!-- ── Grid ─────────────────────────────────────────────────────────── -->
      {#each xTicks as tx}
        <line x1={toSvgX(tx)} y1={PAD.top}
              x2={toSvgX(tx)} y2={PAD.top + plotH} class="grid-line" />
      {/each}
      {#each yTicks as ty}
        <line x1={PAD.left}         y1={toSvgY(ty)}
              x2={PAD.left + plotW} y2={toSvgY(ty)} class="grid-line" />
      {/each}

      <!-- ── Axes ──────────────────────────────────────────────────────────── -->
      <line x1={PAD.left}         y1={toSvgY(0)}
            x2={PAD.left + plotW} y2={toSvgY(0)} class="axis" />
      <line x1={toSvgX(0)} y1={PAD.top}
            x2={toSvgX(0)} y2={PAD.top + plotH} class="axis" />

      <!-- ── Tick labels ────────────────────────────────────────────────────── -->
      {#each xTicks as tx}
        <text x={toSvgX(tx)} y={PAD.top + plotH + 18}
              class="tick-label" text-anchor="middle">{tx}</text>
      {/each}
      {#each yTicks as ty}
        {#if ty > 0}
          <text x={PAD.left - 8} y={toSvgY(ty)}
                class="tick-label" text-anchor="end"
                dominant-baseline="middle">{ty}</text>
        {/if}
      {/each}

      <!-- Axis titles -->
      <text x={PAD.left + plotW / 2} y={VH - 4}
            class="axis-title" text-anchor="middle">x (cm)</text>
      <text x={14} y={PAD.top + plotH / 2}
            class="axis-title" text-anchor="middle"
            transform="rotate(-90,14,{PAD.top + plotH / 2})">f (x) (cm)</text>

      <!-- ══ Clipped plot group ════════════════════════════════════════════ -->
      <g clip-path="url(#plot-area)">

        <!-- Tangent (green dashed) – drawn first so secant renders on top -->
        <polyline points={tanPoints} class="line-tan" />

        <!-- Secant (red) -->
        <polyline points={sekantePoints} class="line-sek" />

        <!-- Shaded Δx band on x-axis -->
        <rect
          x={toSvgX(x0)}
          y={toSvgY(0) - 6}
          width={toSvgX(x0 + h) - toSvgX(x0)}
          height={12}
          fill={C_SEK} opacity="0.20"
        />

        <!-- Parabola (on top) -->
        <polyline points={funcPoints} class="line-func" />

      </g>
      <!-- ══ End clipped group ═════════════════════════════════════════════ -->

      <!-- Δx label -->
      <text
        x={(toSvgX(x0) + toSvgX(x0 + h)) / 2}
        y={toSvgY(0) - 11}
        class="delta-label" text-anchor="middle"
      >Δx = {h.toFixed(2)}</text>

      <!-- P₁ (base point, fixed, orange) -->
      <circle cx={px0.x} cy={px0.y} r="6" fill={C_PT0} />
      <text x={px0.x - 10} y={px0.y - 12} class="point-lbl" text-anchor="middle">P₁</text>

      <!-- P₂ (moves with slider, red) -->
      <circle cx={px1.x} cy={px1.y} r="6" fill={C_SEK} />
      <text x={px1.x + 10} y={px1.y - 12} class="point-lbl" text-anchor="start">P₂</text>

      <!-- Legend -->
      <g transform="translate({PAD.left + 8},{PAD.top + 10})">
        <line x1="0" y1="8"  x2="22" y2="8"
              stroke={C_FUNC} stroke-width="2.5" />
        <text x="27" y="12" class="legend-txt">f(x) = 0.02x² − 0.6x + 6</text>

        <line x1="0" y1="26" x2="22" y2="26"
              stroke={C_SEK} stroke-width="2" />
        <text x="27" y="30" class="legend-txt">
          Secant  (slope = {slopeDisplay})
        </text>

        <line x1="0" y1="44" x2="22" y2="44"
              stroke={C_TAN} stroke-width="2"
              stroke-dasharray="6 4" />
        <text x="27" y="48" class="legend-txt">
          Tangent at x₀=5  (slope = {tanDisplay})
        </text>
      </g>

    </svg>
  </div>

  <!-- ── Controls ──────────────────────────────────────────────────────────── -->
  <div class="controls">

    <div class="slider-row">
      <label for="sl-h">h</label>
      <input id="sl-h" type="range"
             min={H_MIN} max={H_MAX} step={H_STEP}
             bind:value={h} />
      <span class="sl-val">{h.toFixed(2)}</span>
    </div>

    <div class="presets">
      <span class="preset-lbl">Preset h:</span>
      {#each [10, 5, 2, 1, 0.5, 0.1, 0.01] as preset}
        <button
          class:active={Math.abs(h - preset) < 0.005}
          on:click={() => h = preset}
        >{preset}</button>
      {/each}
    </div>

  </div>

  <!-- ── Info tiles ─────────────────────────────────────────────────────────── -->
  <div class="info-bar">

    <div class="info-tile">
      <span class="info-lbl">Secant slope Δf / Δx</span>
      <span class="info-val" style="color:{C_SEK}">{slopeDisplay}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Tangent slope f ′(x₀)</span>
      <span class="info-val" style="color:{C_TAN}">{tanDisplay}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Error |Δf/Δx − f ′(x₀)|</span>
      <span class="info-val" style="color:{errorColor}">{errorDisplay}</span>
    </div>

  </div>

</div>


<!-- ══════════════════════════════════════════════════════════════════════════
     STYLES
     ══════════════════════════════════════════════════════════════════════════ -->

<style>
  /* ── Design tokens ──────────────────────────────────────────────────────── */
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

  /* ── Container ──────────────────────────────────────────────────────────── */
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

  /* ── Header ─────────────────────────────────────────────────────────────── */
  header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    background: #f3f4f6;
  }
  header h1 {
    font-size: 1.1rem;
    font-weight: normal;
    letter-spacing: .02em;
  }
  header p {
    margin-top: 5px;
    font-size: .82rem;
    font-family: var(--font-ui);
    color: var(--muted);
    line-height: 1.5;
  }

  /* ── Chart ──────────────────────────────────────────────────────────────── */
  .chart-wrap     { padding: 16px 20px 0; background: var(--surface); }
  .chart-wrap svg { width: 100%; height: auto; display: block; }

  /* SVG element styles */
  .grid-line  { stroke: #e8e8e0; stroke-width: 1; }
  .axis       { stroke: #aaa;    stroke-width: 1.5; }

  .tick-label {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: var(--muted);
  }
  .axis-title {
    font-family: var(--font-ui);
    font-size: 12px;
    fill: var(--muted);
    font-style: italic;
  }
  .point-lbl {
    font-family: var(--font-ui);
    font-size: 12px;
    fill: #333;
    font-weight: 700;
  }
  .delta-label {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: #e60000;
    font-weight: 600;
  }
  .legend-txt {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: var(--text);
    dominant-baseline: middle;
  }

  /* Curves */
  .line-func {
    fill: none;
    stroke: #005a94;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .line-sek {
    fill: none;
    stroke: #e60000;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .line-tan {
    fill: none;
    stroke: #1a8a1a;
    stroke-width: 2;
    stroke-dasharray: 8 5;
    stroke-linejoin: round;
  }

  /* ── Controls ───────────────────────────────────────────────────────────── */
  .controls {
    padding: 16px 24px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 1px solid var(--border);
  }
  .slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-ui);
    font-size: .85rem;
  }
  .slider-row label {
    min-width: 24px;
    color: var(--muted);
    font-style: italic;
  }
  .slider-row input[type=range] {
    flex: 1;
    accent-color: #e60000;
    cursor: pointer;
    height: 6px;
  }
  .sl-val {
    min-width: 50px;
    font-weight: 700;
    font-size: .95rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #333;
  }

  /* ── Preset buttons ──────────────────────────────────────────────────────── */
  .presets {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .preset-lbl {
    font-family: var(--font-ui);
    font-size: .78rem;
    color: var(--muted);
    margin-right: 2px;
  }
  button {
    font-family: var(--font-ui);
    font-size: .8rem;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    cursor: pointer;
    color: var(--text);
    transition: background .15s, border-color .15s;
  }
  button:hover  { background: #f0ede0; border-color: #bbb; }
  button.active { background: #e60000; color: #fff; border-color: #e60000; }

  /* ── Info bar ────────────────────────────────────────────────────────────── */
  .info-bar {
    display: flex;
    border-top: 1px solid var(--border);
    background: #f3f4f6;
  }
  .info-tile {
    flex: 1;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }

  .info-lbl {
    font-family: var(--font-ui);
    font-size: .7rem;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--muted);
  }
  .info-val {
    font-family: var(--font-ui);
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>