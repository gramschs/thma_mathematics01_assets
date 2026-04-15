<!--
  ═══════════════════════════════════════════════════════════════════════════════
  App.svelte  –  App 1: Difference Quotient Explorer
  f(x) = 0.02x² − 0.6x + 6,  x ∈ [0, 30]  (parabolic marble track)
  ═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── Height function of the parabolic marble track ─────────────────────────
  const f = x => 0.02 * x * x - 0.6 * x + 6;

  // ── Reactive state ────────────────────────────────────────────────────────
  let x0 = 5;    // base point,  slider range [0, 25]
  let h  = 10;   // step size,   slider range [0.5, 15]

  // ── SVG viewport ─────────────────────────────────────────────────────────
  const VW = 600;
  const VH = 400;
  const PAD = { top: 20, right: 20, bottom: 50, left: 55 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // ── Math domain ───────────────────────────────────────────────────────────
  const xMin = 0, xMax = 30;
  const yMin = 0, yMax = 8;

  // ── Coordinate transforms  (math → SVG pixels) ───────────────────────────
  const toSvgX = x => PAD.left + (x - xMin) / (xMax - xMin) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // ── Dense x-sample for smooth parabola ───────────────────────────────────
  const xs = Array.from({ length: 300 }, (_, i) => xMin + i * (xMax - xMin) / 299);

  // ── Reactive derived quantities ───────────────────────────────────────────
  $: f0     = f(x0);
  $: f1     = f(x0 + h);
  $: deltaF = f1 - f0;
  $: dq     = deltaF / h;           // difference quotient Δf/Δx

  // Parabola polyline string
  $: funcPoints = xs.map(x => `${toSvgX(x)},${toSvgY(f(x))}`).join(' ');

  // Secant: two-point line extended ±3 cm beyond the domain (clip handles rest)
  $: sekantePoints = (() => {
    const xL = xMin - 3, xR = xMax + 3;
    const sec = u => f0 + dq * (u - x0);
    return `${toSvgX(xL)},${toSvgY(sec(xL))} ${toSvgX(xR)},${toSvgY(sec(xR))}`;
  })();

  // SVG pixel positions of P1 and P2
  $: px1 = { x: toSvgX(x0),     y: toSvgY(f0) };
  $: px2 = { x: toSvgX(x0 + h), y: toSvgY(f1) };

  // Δf arrow: vertical at x = x0+h, from f(x0) down/up to f(x0+h)
  $: arrX  = toSvgX(x0 + h);
  $: arrY1 = toSvgY(f0);   // start: horizontal through P1
  $: arrY2 = toSvgY(f1);   // end:   height of P2

  // P2 is only visible when x0+h stays within the display domain
  $: p2Visible = (x0 + h) <= xMax;

  // Color coding for Δf and the difference quotient
  $: dqColor = dq    < 0 ? '#c8000a' : '#1a7a1a';
  $: dfColor = deltaF < 0 ? '#c8000a' : '#1a7a1a';

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
  const C_SEC  = '#e60000';   // red        – secant, Δx band, P2
  const C_P1   = '#e87846';   // orange     – P1

  // ── Slider bounds ─────────────────────────────────────────────────────────
  const X0_MIN = 0,   X0_MAX = 25,  X0_STEP = 0.5;
  const H_MIN  = 0.5, H_MAX  = 15,  H_STEP  = 0.5;

  onMount(() => {});
</script>

<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App 1 – Difference Quotient Explorer</h1>
    <p>
      Drag the sliders to change the base point x₀ and step size h.
      Watch the secant line tilt and the difference quotient update.
    </p>
  </header>

  <!-- SVG chart -->
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Interactive difference quotient of the marble track">

      <defs>
        <!-- Clip path: restricts all plot contents to the axis rectangle -->
        <clipPath id="plot-area">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
        <!-- Arrowhead for the vertical Δf arrow (orient="auto" rotates it) -->
        <marker id="arr" markerWidth="12" markerHeight="10"
                refX="12" refY="5" orient="auto"
                markerUnits="userSpaceOnUse">
          <polygon points="0 0, 12 5, 0 10" fill="#444" />
        </marker>
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

        <!-- Shaded Δx band on x-axis, labelled below -->
        <rect
          x={toSvgX(x0)}
          y={toSvgY(0) - 6}
          width={toSvgX(x0 + h) - toSvgX(x0)}
          height={12}
          fill={C_SEC} opacity="0.22"
        />

        <!-- Secant line (red, extended across full plot) -->
        <polyline points={sekantePoints} class="line-sec" />

        <!-- Horizontal dashed run line: P1 → foot of Δf arrow -->
        {#if p2Visible}
          <line x1={px1.x} y1={px1.y}
                x2={arrX}  y2={arrY1}
                class="run-line" />
        {/if}

        <!-- Vertical Δf arrow at x = x0+h -->
        {#if p2Visible && Math.abs(deltaF) > 0.005}
          <line x1={arrX} y1={arrY1}
                x2={arrX} y2={arrY2}
                class="rise-arrow"
                marker-end="url(#arr)" />
        {/if}

        <!-- Parabola (drawn last = on top of all other lines) -->
        <polyline points={funcPoints} class="line-func" />

      </g>
      <!-- ══ End clipped group ═════════════════════════════════════════════ -->

      <!-- P1 dot + label (outside clip → never cut off) -->
      <circle cx={px1.x} cy={px1.y} r="6" fill={C_P1} />
      <text x={px1.x - 8} y={px1.y - 12} class="point-lbl" text-anchor="middle">P₁</text>

      <!-- P2 dot + label (only when within the visible domain) -->
      {#if p2Visible}
        <circle cx={px2.x} cy={px2.y} r="6" fill={C_SEC} />
        <text x={px2.x + 8} y={px2.y - 12} class="point-lbl" text-anchor="start">P₂</text>
      {/if}

      <!-- Δx label above the shaded band -->
      <text
        x={(toSvgX(x0) + toSvgX(Math.min(x0 + h, xMax))) / 2}
        y={toSvgY(0) - 12}
        class="delta-lbl" text-anchor="middle"
      >Δx = {h.toFixed(1)}</text>

      <!-- Δf label beside the arrow -->
      {#if p2Visible && Math.abs(deltaF) > 0.005}
        <text
          x={arrX + 10}
          y={(arrY1 + arrY2) / 2}
          class="delta-f-lbl"
          dominant-baseline="middle"
          fill={dfColor}
        >Δf = {deltaF.toFixed(3)}</text>
      {/if}

      <!-- Legend (top-left, inside chart area) -->
      <g transform="translate({PAD.left + 8},{PAD.top + 10})">
        <line x1="0" y1="8"  x2="24" y2="8"  stroke={C_FUNC} stroke-width="2.5" />
        <text x="29" y="12" class="legend-txt">f(x) = 0.02x² − 0.6x + 6</text>
        <line x1="0" y1="26" x2="24" y2="26" stroke={C_SEC}  stroke-width="2" />
        <text x="29" y="30" class="legend-txt">Secant  (slope = {dq.toFixed(3)})</text>
      </g>

    </svg>
  </div>

  <!-- ── Controls ──────────────────────────────────────────────────────────── -->
  <div class="controls">

    <!-- x₀ slider -->
    <div class="slider-row">
      <label for="sl-x0">x₀</label>
      <input id="sl-x0" type="range"
             min={X0_MIN} max={X0_MAX} step={X0_STEP}
             bind:value={x0} />
      <span class="sl-val">{x0.toFixed(1)} cm</span>
    </div>

    <!-- h slider -->
    <div class="slider-row">
      <label for="sl-h">h</label>
      <input id="sl-h" type="range"
             min={H_MIN} max={H_MAX} step={H_STEP}
             bind:value={h} />
      <span class="sl-val">{h.toFixed(1)} cm</span>
    </div>

    <!-- Preset buttons for h -->
    <div class="presets">
      <span class="preset-lbl">Step size h:</span>
      {#each [15, 10, 5, 2, 0.5] as preset}
        <button
          class:active={Math.abs(h - preset) < 0.01}
          on:click={() => h = preset}
        >{preset}</button>
      {/each}
    </div>

  </div>

  <!-- ── Info tiles ─────────────────────────────────────────────────────────── -->
  <div class="info-bar">

    <div class="info-tile">
      <span class="info-lbl">Δx</span>
      <span class="info-val">{h.toFixed(3)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Δf = f(x₀+h) − f(x₀)</span>
      <span class="info-val" style="color:{dfColor}">{deltaF.toFixed(3)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Difference quotient Δf / Δx</span>
      <span class="info-val" style="color:{dqColor}">{dq.toFixed(3)}</span>
    </div>

  </div>

  <!-- Warning when P2 leaves the visible domain -->
  {#if !p2Visible}
    <p class="oov-note">
      ⚠ P₂ is at x₀ + h = {(x0 + h).toFixed(1)} cm, outside the visible
      domain [0, 30 cm]. Reduce h or x₀ to bring P₂ back into view.
    </p>
  {/if}

</div>


<!-- ══════════════════════════════════════════════════════════════════════════
     STYLES  –  scoped to this component
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
  .chart-wrap          { padding: 16px 20px 0; background: var(--surface); }
  .chart-wrap svg      { width: 100%; height: auto; display: block; }

  /* SVG element classes */
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
  .delta-lbl {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: #e60000;
    font-weight: 600;
  }
  .delta-f-lbl {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
  }
  .legend-txt {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: var(--text);
    dominant-baseline: middle;
  }

  /* Curve styles */
  .line-func {
    fill: none;
    stroke: #005a94;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .line-sec {
    fill: none;
    stroke: #e60000;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .run-line {
    fill: none;
    stroke: #888;
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
  }
  .rise-arrow {
    fill: none;
    stroke: #444;
    stroke-width: 2;
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
    min-width: 60px;
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

  /* ── Out-of-view warning ─────────────────────────────────────────────────── */
  .oov-note {
    padding: 8px 24px;
    font-family: var(--font-ui);
    font-size: .78rem;
    color: #c8000a;
    background: #fff5f5;
    border-top: 1px solid #ffd0d0;
    line-height: 1.5;
  }
</style>