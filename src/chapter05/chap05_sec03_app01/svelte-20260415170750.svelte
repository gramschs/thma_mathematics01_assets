<!--
  App.svelte – App 4: Function and its Derivative Side by Side
  f(x)  = 0.02x² − 0.6x + 6
  f′(x) = 0.04x  − 0.6
-->

<script>
  // ── Function & derivative ─────────────────────────────────────────────────
  const f  = x => 0.02 * x * x - 0.6 * x + 6;
  const df = x => 0.04 * x - 0.6;

  // ── State ─────────────────────────────────────────────────────────────────
  let x0 = 5;

  // ── Shared SVG geometry ───────────────────────────────────────────────────
  const VW   = 600;
  const PAD  = { top: 18, right: 22, bottom: 36, left: 52 };
  const plotW = VW - PAD.left - PAD.right;

  // Top panel (f)
  const VH_TOP  = 260;
  const plotH_T = VH_TOP - PAD.top - PAD.bottom;
  const xMin = 0,  xMax = 30;
  const yMinT = 0, yMaxT = 8;

  // Bottom panel (f′)
  const VH_BOT  = 220;
  const plotH_B = VH_BOT - PAD.top - PAD.bottom;
  const yMinB = -0.8, yMaxB = 0.8;

  // ── Coordinate transforms ─────────────────────────────────────────────────
  const toSvgX  = x => PAD.left + (x - xMin) / (xMax - xMin) * plotW;

  const toSvgYt = y =>
    PAD.top + (1 - (y - yMinT) / (yMaxT - yMinT)) * plotH_T;

  const toSvgYb = y =>
    PAD.top + (1 - (y - yMinB) / (yMaxB - yMinB)) * plotH_B;

  // ── Dense samples ─────────────────────────────────────────────────────────
  const xs = Array.from({ length: 300 }, (_, i) => xMin + i * (xMax - xMin) / 299);

  $: funcPoints  = xs.map(x => `${toSvgX(x)},${toSvgYt(f(x))}`).join(' ');
  $: dfPoints    = xs.map(x => `${toSvgX(x)},${toSvgYb(df(x))}`).join(' ');
  $: tanPoints   = xs.map(x =>
      `${toSvgX(x)},${toSvgYt(f(x0) + df(x0) * (x - x0))}`).join(' ');

  // ── Reactive values ───────────────────────────────────────────────────────
  $: fx0  = f(x0);
  $: dfx0 = df(x0);

  // Dot positions
  $: dotT = { x: toSvgX(x0), y: toSvgYt(fx0)  };
  $: dotB = { x: toSvgX(x0), y: toSvgYb(dfx0) };

  // Cursor x (shared)
  $: cursorX = toSvgX(x0);

  // Slope label position: to the right of x0 if room, else left
  $: labelSide = x0 < 20 ? 1 : -1;
  $: labelX    = dotT.x + labelSide * 14;
  $: labelAnchor = labelSide > 0 ? 'start' : 'end';

  // y = 0 line in bottom panel
  $: zeroY = toSvgYb(0);

  // ── Axis ticks ────────────────────────────────────────────────────────────
  function ticks(min, max, step) {
    const r = [];
    for (let v = min; v <= max + 1e-9; v += step) r.push(+v.toFixed(6));
    return r;
  }
  const xTicks  = ticks(xMin, xMax, 5);
  const yTicksT = ticks(yMinT, yMaxT, 1);
  const yTicksB = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];

  // ── Colors ────────────────────────────────────────────────────────────────
  const C_FUNC = '#005a94';
  const C_TAN  = '#1a8a1a';
  const C_DF   = '#c8000a';
  const C_DOT  = '#e87846';

  // ── Presets ───────────────────────────────────────────────────────────────
  const presets = [0, 5, 15, 25, 30];

  // ── Slope color: red (steep neg) → green (zero) → blue (steep pos) ────────
  $: slopeColor = dfx0 < -0.05 ? '#c8000a' : dfx0 > 0.05 ? '#005a94' : '#1a8a1a';
</script>

<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App 4 – Function and its Derivative</h1>
    <p>
      Drag x₀: the green tangent rotates in the top panel while the orange dot
      slides along the red derivative line below. At x₀ = 15 both reach zero —
      the vertex and the zero-crossing coincide.
    </p>
  </header>

  <!-- ── Slider & presets ───────────────────────────────────────────────────── -->
  <div class="ctrl-bar">
    <label for="sl-x0">x₀</label>
    <input id="sl-x0" type="range" min="0" max="30" step="0.1" bind:value={x0} />
    <span class="sl-val">{x0.toFixed(1)}</span>

    <div class="presets">
      {#each presets as p}
        <button class:active={Math.abs(x0 - p) < 0.05} on:click={() => x0 = p}>
          {p}
        </button>
      {/each}
    </div>
  </div>

  <!-- ══ TOP PANEL: f(x) ════════════════════════════════════════════════════ -->
  <div class="panel-label">f (x) = 0.02x² − 0.6x + 6</div>
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH_TOP}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Graph of f(x) with tangent at x0">

      <defs>
        <clipPath id="clip-top">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH_T} />
        </clipPath>
      </defs>

      <!-- Grid -->
      {#each xTicks as tx}
        <line x1={toSvgX(tx)} y1={PAD.top}
              x2={toSvgX(tx)} y2={PAD.top + plotH_T} class="grid" />
      {/each}
      {#each yTicksT as ty}
        <line x1={PAD.left}         y1={toSvgYt(ty)}
              x2={PAD.left + plotW} y2={toSvgYt(ty)} class="grid" />
      {/each}

      <!-- Axes -->
      <line x1={PAD.left}         y1={toSvgYt(0)}
            x2={PAD.left + plotW} y2={toSvgYt(0)} class="axis" />
      <line x1={toSvgX(0)} y1={PAD.top}
            x2={toSvgX(0)} y2={PAD.top + plotH_T} class="axis" />

      <!-- Tick labels -->
      {#each xTicks as tx}
        <text x={toSvgX(tx)} y={PAD.top + plotH_T + 15}
              class="tl" text-anchor="middle">{tx}</text>
      {/each}
      {#each yTicksT as ty}
        {#if ty > 0}
          <text x={PAD.left - 6} y={toSvgYt(ty)}
                class="tl" text-anchor="end" dominant-baseline="middle">{ty}</text>
        {/if}
      {/each}

      <!-- Axis title -->
      <text x={14} y={PAD.top + plotH_T / 2}
            class="at" text-anchor="middle"
            transform="rotate(-90,14,{PAD.top + plotH_T / 2})">f (x)</text>
      <text x={PAD.left + plotW / 2} y={VH_TOP - 2}
            class="at" text-anchor="middle">x (cm)</text>

      <!-- Clipped content -->
      <g clip-path="url(#clip-top)">
        <!-- Vertical cursor -->
        <line x1={cursorX} y1={PAD.top}
              x2={cursorX} y2={PAD.top + plotH_T} class="cursor" />
        <!-- Tangent -->
        <polyline points={tanPoints} class="line-tan" />
        <!-- Parabola -->
        <polyline points={funcPoints} class="line-func" />
      </g>

      <!-- Dot P1 -->
      <circle cx={dotT.x} cy={dotT.y} r="6" fill={C_DOT} />
      <text x={dotT.x - 10} y={dotT.y - 10}
            class="pt-lbl" text-anchor="middle">P₁</text>

      <!-- Slope label next to tangent -->
      <text
        x={labelX}
        y={dotT.y - 4}
        class="slope-lbl"
        text-anchor={labelAnchor}
        style="fill:{slopeColor}"
      >f ′(x₀) = {dfx0.toFixed(3)}</text>

      <!-- Legend -->
      <g transform="translate({PAD.left + 6},{PAD.top + 8})">
        <line x1="0" y1="7"  x2="20" y2="7"  stroke={C_FUNC} stroke-width="2.2" />
        <text x="25" y="11" class="leg">f(x)</text>
        <line x1="0" y1="21" x2="20" y2="21"
              stroke={C_TAN} stroke-width="2" stroke-dasharray="6 3" />
        <text x="25" y="25" class="leg">Tangent at x₀</text>
      </g>

    </svg>
  </div>

  <!-- Connector bar -->
  <div class="connector" style="margin-left:{PAD.left}px; width:{plotW}px">
    <div class="connector-line" style="left:{(x0 / (xMax - xMin) * 100).toFixed(2)}%"></div>
  </div>

  <!-- ══ BOTTOM PANEL: f′(x) ═══════════════════════════════════════════════ -->
  <div class="panel-label" style="color:{C_DF}">f ′(x) = 0.04x − 0.6</div>
  <div class="chart-wrap chart-wrap-bot">
    <svg viewBox="0 0 {VW} {VH_BOT}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Graph of f′(x) with moving dot">

      <defs>
        <clipPath id="clip-bot">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH_B} />
        </clipPath>
      </defs>

      <!-- Grid -->
      {#each xTicks as tx}
        <line x1={toSvgX(tx)} y1={PAD.top}
              x2={toSvgX(tx)} y2={PAD.top + plotH_B} class="grid" />
      {/each}
      {#each yTicksB as ty}
        <line x1={PAD.left}         y1={toSvgYb(ty)}
              x2={PAD.left + plotW} y2={toSvgYb(ty)} class="grid" />
      {/each}

      <!-- Zero reference line -->
      <line x1={PAD.left} y1={zeroY}
            x2={PAD.left + plotW} y2={zeroY}
            class="zero-line" clip-path="url(#clip-bot)" />
      <text x={PAD.left + plotW + 2} y={zeroY}
            class="zero-lbl" dominant-baseline="middle">f ′= 0</text>

      <!-- Axes -->
      <line x1={PAD.left}         y1={toSvgYb(0)}
            x2={PAD.left + plotW} y2={toSvgYb(0)} class="axis" />
      <line x1={toSvgX(0)} y1={PAD.top}
            x2={toSvgX(0)} y2={PAD.top + plotH_B} class="axis" />

      <!-- Tick labels -->
      {#each xTicks as tx}
        <text x={toSvgX(tx)} y={PAD.top + plotH_B + 15}
              class="tl" text-anchor="middle">{tx}</text>
      {/each}
      {#each yTicksB as ty}
        <text x={PAD.left - 6} y={toSvgYb(ty)}
              class="tl" text-anchor="end" dominant-baseline="middle">
          {ty.toFixed(1)}
        </text>
      {/each}

      <!-- Axis title -->
      <text x={14} y={PAD.top + plotH_B / 2}
            class="at" text-anchor="middle"
            transform="rotate(-90,14,{PAD.top + plotH_B / 2})">f ′(x)</text>
      <text x={PAD.left + plotW / 2} y={VH_BOT - 2}
            class="at" text-anchor="middle">x (cm)</text>

      <!-- Clipped content -->
      <g clip-path="url(#clip-bot)">
        <!-- Vertical cursor -->
        <line x1={cursorX} y1={PAD.top}
              x2={cursorX} y2={PAD.top + plotH_B} class="cursor" />
        <!-- Derivative line -->
        <polyline points={dfPoints} class="line-df" />
      </g>

      <!-- Dot on f′ -->
      <circle cx={dotB.x} cy={dotB.y} r="6" fill={C_DOT} />
      <text x={dotB.x + 10} y={dotB.y - 8}
            class="pt-lbl" text-anchor="start"
            style="fill:{slopeColor}">{dfx0.toFixed(3)}</text>

      <!-- Legend -->
      <g transform="translate({PAD.left + 6},{PAD.top + 8})">
        <line x1="0" y1="7" x2="20" y2="7" stroke={C_DF} stroke-width="2.2" />
        <text x="25" y="11" class="leg">f ′(x) = 0.04x − 0.6</text>
      </g>

    </svg>
  </div>

  <!-- ── Info bar ───────────────────────────────────────────────────────────── -->
  <div class="info-bar">
    <div class="info-tile">
      <span class="info-lbl">Base point x₀</span>
      <span class="info-val">{x0.toFixed(1)} cm</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">f (x₀)</span>
      <span class="info-val" style="color:{C_FUNC}">{fx0.toFixed(4)}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">Tangent slope f ′(x₀)</span>
      <span class="info-val" style="color:{slopeColor}">{dfx0.toFixed(4)}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">Zero at x = 15 (vertex)</span>
      <span class="info-val" style="color:#1a8a1a">{Math.abs(x0 - 15) < 0.1 ? '✓ f ′= 0' : 'x₀ ≠ 15'}</span>
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

  /* ── Slider bar ──────────────────────────────────────────────────────────── */
  .ctrl-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-wrap: wrap;
  }
  .ctrl-bar label {
    font-family: var(--font-ui);
    font-size: .85rem;
    font-style: italic;
    color: var(--muted);
    min-width: 20px;
  }
  .ctrl-bar input[type=range] {
    flex: 1;
    min-width: 160px;
    accent-color: #e87846;
    cursor: pointer;
    height: 6px;
  }
  .sl-val {
    font-family: var(--font-ui);
    font-size: .95rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 38px;
  }

  /* ── Presets ─────────────────────────────────────────────────────────────── */
  .presets {
    display: flex;
    gap: 6px;
  }
  button {
    font-family: var(--font-ui);
    font-size: .78rem;
    padding: 3px 9px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    cursor: pointer;
    color: var(--text);
    transition: background .13s, border-color .13s;
  }
  button:hover  { background: #f0ede0; border-color: #bbb; }
  button.active { background: #e87846; color: #fff; border-color: #e87846; }

  /* ── Panel labels ────────────────────────────────────────────────────────── */
  .panel-label {
    padding: 6px 24px 0;
    font-family: var(--font-ui);
    font-size: .78rem;
    font-weight: 600;
    color: #005a94;
    letter-spacing: .02em;
  }

  /* ── Charts ──────────────────────────────────────────────────────────────── */
  .chart-wrap     { padding: 4px 8px 0; }
  .chart-wrap svg { width: 100%; height: auto; display: block; }
  .chart-wrap-bot { padding-bottom: 0; }

  /* ── Connector between panels ────────────────────────────────────────────── */
  .connector {
    position: relative;
    height: 12px;
    background: linear-gradient(to bottom, #f3f4f6, #fff);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    overflow: hidden;
  }
  .connector-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.5px;
    background: rgba(232, 120, 70, 0.5);
    transform: translateX(-50%);
    pointer-events: none;
  }

  /* SVG element styles */
  .grid     { stroke: #e8e8e0; stroke-width: .8; }
  .axis     { stroke: #aaa;    stroke-width: 1.3; }
  .cursor   {
    stroke: #e87846;
    stroke-width: 1.2;
    stroke-dasharray: 4 3;
    opacity: .7;
  }
  .zero-line {
    stroke: #1a8a1a;
    stroke-width: 1.4;
    stroke-dasharray: 8 4;
    opacity: .6;
  }
  .zero-lbl {
    font-family: 'Helvetica Neue', sans-serif;
    font-size: 9px;
    fill: #1a8a1a;
  }

  .tl  { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #888; }
  .at  { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #888; font-style: italic; }
  .leg { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #333; dominant-baseline: middle; }
  .pt-lbl    { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; fill: #333; font-weight: 700; }
  .slope-lbl { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 700; }

  .line-func {
    fill: none; stroke: #005a94;
    stroke-width: 2.4; stroke-linejoin: round;
  }
  .line-tan {
    fill: none; stroke: #1a8a1a;
    stroke-width: 2; stroke-dasharray: 8 4;
  }
  .line-df {
    fill: none; stroke: #c8000a;
    stroke-width: 2.4; stroke-linejoin: round;
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
    min-width: 120px;
    padding: 10px 14px;
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
</style>