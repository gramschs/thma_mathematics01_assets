<!--
  App.svelte – App 5: Tangent Line and Linear Approximation
  f(x)  = 0.02x² − 0.6x + 6
  f′(x) = 0.04x  − 0.6
  t(x)  = f(x0) + f′(x0)·(x − x0)
-->

<script>
  // ── Function & derivative ─────────────────────────────────────────────────
  const f   = x => 0.02 * x * x - 0.6 * x + 6;
  const df  = x => 0.04 * x - 0.6;
  const tan = (x, x0) => f(x0) + df(x0) * (x - x0);

  // ── State ─────────────────────────────────────────────────────────────────
  let x0   = 5;
  let x1   = 10;
  let zoom = 2;     // half-width w of the zoom window

  // ── Main SVG geometry ─────────────────────────────────────────────────────
  const VW   = 600;
  const VH   = 380;
  const PAD  = { top: 18, right: 22, bottom: 38, left: 52 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  const xMin = 0,  xMax = 30;
  const yMin = 0,  yMax = 8;

  const toSvgX = x => PAD.left + (x - xMin) / (xMax - xMin) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // ── Zoom inset geometry ───────────────────────────────────────────────────
  const INS = { x: PAD.left + plotW - 168, y: PAD.top + plotH - 148,
                w: 162, h: 142, pad: 8 };

  // Dense samples for main view
  const xs300 = Array.from({ length: 300 }, (_, i) => xMin + i * (xMax - xMin) / 299);

  // ── Reactive main polylines ───────────────────────────────────────────────
  $: funcPoints = xs300.map(x => `${toSvgX(x)},${toSvgY(f(x))}`).join(' ');
  $: tanPoints  = xs300.map(x => `${toSvgX(x)},${toSvgY(tan(x, x0))}`).join(' ');

  // ── Reactive key values ───────────────────────────────────────────────────
  $: fx0    = f(x0);
  $: dfx0   = df(x0);
  $: fx1    = f(x1);
  $: tx1    = tan(x1, x0);
  $: err    = Math.abs(fx1 - tx1);

  // ── Dot positions (main) ──────────────────────────────────────────────────
  $: dot0 = { x: toSvgX(x0), y: toSvgY(fx0)  };
  $: dot1 = { x: toSvgX(x1), y: toSvgY(fx1)  };
  $: dot1t = { x: toSvgX(x1), y: toSvgY(tx1) };

  // Error label position
  $: errMidY = (dot1.y + dot1t.y) / 2;

  // Tangent formula string
  $: tanFormula = (() => {
    const m = dfx0, b = fx0 - dfx0 * x0;
    const ms = m >= 0 ? `+${m.toFixed(3)}` : `${m.toFixed(3)}`;
    const bs = b >= 0 ? `+${b.toFixed(3)}` : `${b.toFixed(3)}`;
    return `${ms}·x ${bs}`;
  })();

  // ── Zoom inset ────────────────────────────────────────────────────────────
  $: zW = zoom;   // half-width in math units
  $: zxMin = x0 - zW, zxMax = x0 + zW;
  $: zyMin = f(x0) - zW * 0.6, zyMax = f(x0) + zW * 0.6;
  // ensure zyMin != zyMax to avoid /0
  $: zyRange = Math.max(zyMax - zyMin, 0.001);

  const IW = INS.w - 2 * INS.pad;
  const IH = INS.h - 2 * INS.pad;

  const toIx = (x, zxMn, zxMx) =>
    INS.x + INS.pad + (x - zxMn) / (zxMx - zxMn) * IW;
  const toIy = (y, zyMn, zyRng) =>
    INS.y + INS.pad + (1 - (y - zyMn) / zyRng) * IH;

  // 80 samples inside zoom window
  $: zxs = Array.from({ length: 80 }, (_, i) =>
    zxMin + i * (zxMax - zxMin) / 79);

  $: zFuncPts = zxs.map(x =>
    `${toIx(x, zxMin, zxMax)},${toIy(f(x), zyMin, zyRange)}`).join(' ');
  $: zTanPts  = zxs.map(x =>
    `${toIx(x, zxMin, zxMax)},${toIy(tan(x, x0), zyMin, zyRange)}`).join(' ');

  // x0 dot in inset
  $: zDot0 = {
    x: toIx(x0,  zxMin, zxMax),
    y: toIy(fx0, zyMin, zyRange)
  };

  // ── Axis ticks (main) ─────────────────────────────────────────────────────
  function ticks(mn, mx, step) {
    const r = [];
    for (let v = mn; v <= mx + 1e-9; v += step) r.push(+v.toFixed(6));
    return r;
  }
  const xTicks = ticks(xMin, xMax, 5);
  const yTicks = ticks(yMin, yMax, 1);

  // ── Colors ────────────────────────────────────────────────────────────────
  const C_FUNC = '#005a94';
  const C_TAN  = '#1a8a1a';
  const C_ERR  = '#e60000';
  const C_DOT0 = '#e87846';

  // ── Error color ───────────────────────────────────────────────────────────
  $: errColor = err < 0.05 ? '#1a7a1a' : '#c8000a';

  // ── Presets ───────────────────────────────────────────────────────────────
  const presets = [5, 15, 25];
</script>

<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App 5 – Tangent Line and Linear Approximation</h1>
    <p>
      Move x₀ to reposition the tangent. Move x₁ to probe the approximation
      error. Use the Zoom slider to magnify the neighbourhood of x₀ — watch
      the parabola become indistinguishable from the tangent.
    </p>
  </header>

  <!-- ── Controls ──────────────────────────────────────────────────────────── -->
  <div class="ctrl-bar">

    <div class="slider-row">
      <label for="sl-x0">x₀</label>
      <input id="sl-x0" type="range" min="0" max="30" step="0.1" bind:value={x0} />
      <span class="sl-val">{x0.toFixed(1)}</span>
    </div>

    <div class="slider-row">
      <label for="sl-x1">x₁</label>
      <input id="sl-x1" type="range" min="0" max="30" step="0.1" bind:value={x1} />
      <span class="sl-val">{x1.toFixed(1)}</span>
    </div>

    <div class="slider-row">
      <label for="sl-zoom">Zoom</label>
      <input id="sl-zoom" type="range" min="0.05" max="2" step="0.05" bind:value={zoom} />
      <span class="sl-val">±{zoom.toFixed(2)}</span>
    </div>

    <div class="presets">
      <span class="preset-lbl">x₀ preset:</span>
      {#each presets as p}
        <button class:active={Math.abs(x0 - p) < 0.05} on:click={() => x0 = p}>
          {p}
        </button>
      {/each}
    </div>

  </div>

  <!-- ── Main chart ─────────────────────────────────────────────────────────── -->
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Parabola with tangent line and approximation error">

      <defs>
        <clipPath id="clip-main">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
        <clipPath id="clip-inset">
          <rect x={INS.x} y={INS.y} width={INS.w} height={INS.h} />
        </clipPath>
      </defs>

      <!-- ── Main grid ─────────────────────────────────────────────────────── -->
      {#each xTicks as tx}
        <line x1={toSvgX(tx)} y1={PAD.top}
              x2={toSvgX(tx)} y2={PAD.top + plotH} class="grid" />
      {/each}
      {#each yTicks as ty}
        <line x1={PAD.left}         y1={toSvgY(ty)}
              x2={PAD.left + plotW} y2={toSvgY(ty)} class="grid" />
      {/each}

      <!-- ── Main axes ─────────────────────────────────────────────────────── -->
      <line x1={PAD.left}         y1={toSvgY(0)}
            x2={PAD.left + plotW} y2={toSvgY(0)} class="axis" />
      <line x1={toSvgX(0)} y1={PAD.top}
            x2={toSvgX(0)} y2={PAD.top + plotH} class="axis" />

      <!-- ── Tick labels ────────────────────────────────────────────────────── -->
      {#each xTicks as tx}
        <text x={toSvgX(tx)} y={PAD.top + plotH + 14}
              class="tl" text-anchor="middle">{tx}</text>
      {/each}
      {#each yTicks as ty}
        {#if ty > 0}
          <text x={PAD.left - 6} y={toSvgY(ty)}
                class="tl" text-anchor="end" dominant-baseline="middle">{ty}</text>
        {/if}
      {/each}

      <!-- Axis titles -->
      <text x={PAD.left + plotW / 2} y={VH - 2}
            class="at" text-anchor="middle">x (cm)</text>
      <text x={14} y={PAD.top + plotH / 2}
            class="at" text-anchor="middle"
            transform="rotate(-90,14,{PAD.top + plotH / 2})">f (x)</text>

      <!-- ══ Clipped main plot ═════════════════════════════════════════════ -->
      <g clip-path="url(#clip-main)">

        <!-- Zoom window indicator on main plot -->
        <rect
          x={toSvgX(x0 - zoom)} y={PAD.top}
          width={toSvgX(x0 + zoom) - toSvgX(x0 - zoom)}
          height={plotH}
          fill="#e87846" opacity="0.07"
          stroke="#e87846" stroke-width="1" stroke-dasharray="4 3"
        />

        <!-- Error vertical line (dashed, red) -->
        {#if Math.abs(err) > 0.001}
          <line
            x1={dot1.x} y1={dot1.y}
            x2={dot1t.x} y2={dot1t.y}
            class="err-line"
          />
        {/if}

        <!-- Tangent line (green) -->
        <polyline points={tanPoints} class="line-tan" />

        <!-- Parabola (blue) -->
        <polyline points={funcPoints} class="line-func" />

      </g>
      <!-- ══ End clipped ═══════════════════════════════════════════════════ -->

      <!-- x1 vertical dashed cursor -->
      <line x1={dot1.x} y1={PAD.top}
            x2={dot1.x} y2={PAD.top + plotH}
            class="x1-cursor" clip-path="url(#clip-main)" />

      <!-- Dot at x1 on f (red) -->
      <circle cx={dot1.x} cy={dot1.y}  r="5" fill={C_ERR} />
      <!-- Dot at x1 on tangent (hollow green) -->
      <circle cx={dot1t.x} cy={dot1t.y} r="4"
              fill="white" stroke={C_TAN} stroke-width="2" />

      <!-- Error label -->
      {#if Math.abs(err) > 0.001}
        <text
          x={dot1.x + 7}
          y={errMidY}
          class="err-lbl"
          dominant-baseline="middle"
          style="fill:{errColor}"
        >ε={err.toFixed(4)}</text>
      {/if}

      <!-- Dot at x0 (orange, on top) -->
      <circle cx={dot0.x} cy={dot0.y} r="6" fill={C_DOT0} />
      <text x={dot0.x} y={dot0.y - 11}
            class="pt-lbl" text-anchor="middle">P₀</text>

      <!-- ── Zoom inset ────────────────────────────────────────────────────── -->
      <!-- Background -->
      <rect x={INS.x} y={INS.y} width={INS.w} height={INS.h}
            fill="#fffff8" stroke="#bbb" stroke-width="1" rx="4" />

      <!-- Inset label -->
      <text x={INS.x + 4} y={INS.y + 11} class="inset-lbl">
        Zoom ±{zoom.toFixed(2)} cm
      </text>

      <!-- Inset zero x/y guides -->
      <line
        x1={INS.x + INS.pad} y1={toIy(fx0, zyMin, zyRange)}
        x2={INS.x + INS.pad + IW} y2={toIy(fx0, zyMin, zyRange)}
        stroke="#ddd" stroke-width="0.8" clip-path="url(#clip-inset)"
      />

      <!-- Clipped inset curves -->
      <g clip-path="url(#clip-inset)">
        <!-- Inset padding border -->
        <rect x={INS.x + INS.pad} y={INS.y + INS.pad}
              width={IW} height={IH}
              fill="none" stroke="#e0e0d8" stroke-width="0.6" />

        <!-- Tangent (green) -->
        <polyline points={zTanPts} class="inset-tan" />
        <!-- Parabola (blue) -->
        <polyline points={zFuncPts} class="inset-func" />

        <!-- x0 dot in inset -->
        <circle cx={zDot0.x} cy={zDot0.y} r="4" fill={C_DOT0} />
      </g>

      <!-- "locally linear" label -->
      <text x={INS.x + INS.w / 2} y={INS.y + INS.h - 4}
            class="inset-lbl" text-anchor="middle"
            style="fill:#1a8a1a">
        {zoom <= 0.15 ? '≈ locally linear ✓' : 'reduce zoom →'}
      </text>

      <!-- Main legend -->
      <g transform="translate({PAD.left + 6},{PAD.top + 8})">
        <line x1="0" y1="7"  x2="20" y2="7"
              stroke={C_FUNC} stroke-width="2.2" />
        <text x="24" y="11" class="leg">f (x) = 0.02x² − 0.6x + 6</text>

        <line x1="0" y1="21" x2="20" y2="21"
              stroke={C_TAN} stroke-width="2" stroke-dasharray="6 3" />
        <text x="24" y="25" class="leg">t(x) = {tanFormula}</text>

        <line x1="0" y1="35" x2="20" y2="35"
              stroke={C_ERR} stroke-width="1.8" stroke-dasharray="3 2" />
        <text x="24" y="39" class="leg">error at x₁</text>
      </g>

    </svg>
  </div>

  <!-- ── Info tiles ─────────────────────────────────────────────────────────── -->
  <div class="info-bar">

    <div class="info-tile">
      <span class="info-lbl">x₀</span>
      <span class="info-val">{x0.toFixed(2)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">f (x₀)</span>
      <span class="info-val" style="color:{C_FUNC}">{fx0.toFixed(4)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">f ′(x₀)</span>
      <span class="info-val" style="color:{C_TAN}">{dfx0.toFixed(4)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">t (x) =</span>
      <span class="info-val info-val-sm">{tanFormula}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Error |f(x₁) − t(x₁)|</span>
      <span class="info-val" style="color:{errColor}">{err.toFixed(4)}</span>
    </div>

  </div>

</div>


<!-- ══════════════════════════════════════════════════════════════════════════
     STYLES
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
    padding: 18px 24px 14px;
    border-bottom: 1px solid var(--border);
    background: #f3f4f6;
  }
  header h1 {
    font-size: 1.05rem;
    font-weight: normal;
    letter-spacing: .02em;
    color: var(--text);
  }
  header p {
    margin-top: 5px;
    font-size: .8rem;
    font-family: var(--font-ui);
    color: var(--muted);
    line-height: 1.5;
  }

  /* ── Control bar ─────────────────────────────────────────────────────────── */
  .ctrl-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-ui);
    font-size: .84rem;
  }
  .slider-row label {
    min-width: 38px;
    color: var(--muted);
    font-style: italic;
  }
  .slider-row input[type=range] {
    flex: 1;
    accent-color: #e87846;
    cursor: pointer;
    height: 6px;
  }
  .sl-val {
    min-width: 50px;
    font-family: var(--font-ui);
    font-size: .9rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: #333;
  }

  /* ── Presets ─────────────────────────────────────────────────────────────── */
  .presets {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .preset-lbl {
    font-family: var(--font-ui);
    font-size: .76rem;
    color: var(--muted);
  }
  button {
    font-family: var(--font-ui);
    font-size: .78rem;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    cursor: pointer;
    color: var(--text);
    transition: background .13s, border-color .13s;
  }
  button:hover  { background: #f0ede0; border-color: #bbb; }
  button.active { background: #e87846; color: #fff; border-color: #e87846; }

  /* ── Chart ───────────────────────────────────────────────────────────────── */
  .chart-wrap     { padding: 4px 8px 0; }
  .chart-wrap svg { width: 100%; height: auto; display: block; }

  /* SVG classes */
  .grid    { stroke: #e8e8e0; stroke-width: .8; }
  .axis    { stroke: #aaa;    stroke-width: 1.3; }

  .x1-cursor {
    stroke: #e60000;
    stroke-width: 1;
    stroke-dasharray: 4 3;
    opacity: .5;
  }
  .err-line {
    stroke: #e60000;
    stroke-width: 2;
    stroke-dasharray: 5 3;
  }

  .tl  { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #888; }
  .at  { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #888; font-style: italic; }
  .leg { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #333; dominant-baseline: middle; }
  .pt-lbl   { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; fill: #333; font-weight: 700; }
  .err-lbl  { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; font-weight: 700; }
  .inset-lbl { font-family: 'Helvetica Neue', sans-serif; font-size: 9px; fill: #888; }

  .line-func {
    fill: none; stroke: #005a94;
    stroke-width: 2.4; stroke-linejoin: round;
  }
  .line-tan {
    fill: none; stroke: #1a8a1a;
    stroke-width: 2; stroke-dasharray: 8 4;
  }
  .inset-func {
    fill: none; stroke: #005a94;
    stroke-width: 2; stroke-linejoin: round;
  }
  .inset-tan {
    fill: none; stroke: #1a8a1a;
    stroke-width: 1.8; stroke-dasharray: 6 3;
  }

  /* ── Info bar ────────────────────────────────────────────────────────────── */
  .info-bar {
    display: flex;
    border-top: 1px solid var(--border);
    background: #f3f4f6;
    flex-wrap: wrap;
  }
  .info-tile {
    flex: 1;
    min-width: 100px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }
  .info-lbl {
    font-family: var(--font-ui);
    font-size: .67rem;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--muted);
  }
  .info-val {
    font-family: var(--font-ui);
    font-size: 1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .info-val-sm {
    font-size: .82rem;
    letter-spacing: -.01em;
  }
</style>