<!--
  App.svelte – App 3: Convergence to the Differential Quotient
  f(x) = 0.02x² − 0.6x + 6,  x ∈ [0, 30]
-->

<script>
  // ── Function & derivative ─────────────────────────────────────────────────
  const f  = x => 0.02 * x * x - 0.6 * x + 6;
  const df = x => 0.04 * x - 0.6;

  // ── State ─────────────────────────────────────────────────────────────────
  let x0          = 5;
  let selectedIdx = 3;   // which Δx row is highlighted (0–5)

  // ── Δx values ────────────────────────────────────────────────────────────
  const deltas = [2, 1, 0.5, 0.1, 0.01, 0.001];

  // ── Reactive table rows ───────────────────────────────────────────────────
  $: rows = deltas.map(dx => {
    const fx0 = f(x0);
    const fx1 = f(x0 + dx);
    const df_  = fx1 - fx0;
    const dq   = df_ / dx;
    return { dx, fx1, df: df_, dq };
  });

  $: analytical = df(x0);

  // ── SVG viewport ─────────────────────────────────────────────────────────
  const VW = 340;
  const VH = 280;
  const PAD = { top: 16, right: 14, bottom: 38, left: 42 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // ── Math domain ───────────────────────────────────────────────────────────
  const xMin = 0, xMax = 30;
  const yMin = 0, yMax = 8;

  const toSvgX = x => PAD.left + (x - xMin) / (xMax - xMin) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // ── Dense x-sample for smooth parabola ───────────────────────────────────
  const xs = Array.from({ length: 300 }, (_, i) => xMin + i * (xMax - xMin) / 299);
  $: funcPoints = xs.map(x => `${toSvgX(x)},${toSvgY(f(x))}`).join(' ');

  // ── Reactive secant & tangent lines ──────────────────────────────────────
  $: selectedDx   = deltas[selectedIdx];
  $: slope_sek    = rows[selectedIdx].dq;
  $: sekantePoints = xs.map(x => `${toSvgX(x)},${toSvgY(f(x0) + slope_sek * (x - x0))}`).join(' ');
  $: tanPoints     = xs.map(x => `${toSvgX(x)},${toSvgY(f(x0) + analytical  * (x - x0))}`).join(' ');

  // ── Point positions ───────────────────────────────────────────────────────
  $: px0 = { x: toSvgX(x0),              y: toSvgY(f(x0))              };
  $: px1 = { x: toSvgX(x0 + selectedDx), y: toSvgY(f(x0 + selectedDx)) };

  // ── Axis ticks ────────────────────────────────────────────────────────────
  function ticks(min, max, step) {
    const r = [];
    for (let v = min; v <= max + 1e-9; v += step) r.push(+v.toFixed(6));
    return r;
  }
  const xTicks = ticks(xMin, xMax, 5);
  const yTicks = ticks(yMin, yMax, 2);

  // ── Colors ────────────────────────────────────────────────────────────────
  const C_FUNC = '#005a94';
  const C_SEK  = '#e60000';
  const C_TAN  = '#1a8a1a';
  const C_PT0  = '#e87846';

  // ── Error color per row ───────────────────────────────────────────────────
  function errColor(dq) {
    const err = Math.abs(dq - analytical);
    const maxErr = 0.5;
    const t   = Math.max(0, Math.min(1, 1 - err / maxErr));
    const hue = Math.round(t * 120);
    return `hsl(${hue}, 70%, 35%)`;
  }

  // ── Fmt helpers ───────────────────────────────────────────────────────────
  const fmt = (v, d=4) => v.toFixed(d);
</script>

<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App 3 – Convergence to the Differential Quotient</h1>
    <p>
      Move x₀ to change the base point. Click a row to see the corresponding
      secant in the graph. At x₀ = 15 the tangent is horizontal (vertex).
    </p>
  </header>

  <!-- ── x₀ slider ────────────────────────────────────────────────────────── -->
  <div class="x0-bar">
    <label for="sl-x0">x₀</label>
    <input id="sl-x0" type="range" min="0" max="28" step="0.5" bind:value={x0} />
    <span class="sl-val">{x0.toFixed(1)} cm</span>
    <span class="deriv-hint">f ′(x₀) = {fmt(analytical, 3)}</span>
  </div>

  <!-- ── Two-panel layout ──────────────────────────────────────────────────── -->
  <div class="panels">

    <!-- LEFT: Convergence table -->
    <div class="panel panel-table">
      <h2>Convergence table</h2>
      <table>
        <thead>
          <tr>
            <th>Δx</th>
            <th>f(x₀ + Δx)</th>
            <th>Δf</th>
            <th>Δf / Δx</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, i}
            <tr
              class:selected={i === selectedIdx}
              on:click={() => selectedIdx = i}
              title="Click to show secant for Δx = {row.dx}"
            >
              <td class="mono">{row.dx}</td>
              <td class="mono">{fmt(row.fx1, 4)}</td>
              <td class="mono" style="color:{row.df < 0 ? '#c8000a' : '#1a7a1a'}">
                {fmt(row.df, 4)}
              </td>
              <td class="mono dq" style="color:{errColor(row.dq)}">
                {fmt(row.dq, 4)}
              </td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="foot-row">
            <td colspan="4">
              approaches f ′(x₀) =
              <strong>{fmt(analytical, 4)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Δx button row -->
      <div class="dx-btns">
        <span class="preset-lbl">Show secant for Δx:</span>
        {#each deltas as dx, i}
          <button
            class:active={i === selectedIdx}
            on:click={() => selectedIdx = i}
          >{dx}</button>
        {/each}
      </div>
    </div>

    <!-- RIGHT: Graph -->
    <div class="panel panel-graph">
      <h2>Graph</h2>
      <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
           role="img" aria-label="Parabola with secant and tangent">

        <defs>
          <clipPath id="clip3">
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <!-- Grid -->
        {#each xTicks as tx}
          <line x1={toSvgX(tx)} y1={PAD.top}
                x2={toSvgX(tx)} y2={PAD.top + plotH} class="grid-line" />
        {/each}
        {#each yTicks as ty}
          <line x1={PAD.left}         y1={toSvgY(ty)}
                x2={PAD.left + plotW} y2={toSvgY(ty)} class="grid-line" />
        {/each}

        <!-- Axes -->
        <line x1={PAD.left}         y1={toSvgY(0)}
              x2={PAD.left + plotW} y2={toSvgY(0)} class="axis" />
        <line x1={toSvgX(0)} y1={PAD.top}
              x2={toSvgX(0)} y2={PAD.top + plotH} class="axis" />

        <!-- Tick labels -->
        {#each xTicks as tx}
          <text x={toSvgX(tx)} y={PAD.top + plotH + 14}
                class="tick-lbl" text-anchor="middle">{tx}</text>
        {/each}
        {#each yTicks as ty}
          {#if ty > 0}
            <text x={PAD.left - 6} y={toSvgY(ty)}
                  class="tick-lbl" text-anchor="end"
                  dominant-baseline="middle">{ty}</text>
          {/if}
        {/each}

        <!-- Axis titles -->
        <text x={PAD.left + plotW / 2} y={VH - 2}
              class="axis-title" text-anchor="middle">x (cm)</text>
        <text x={11} y={PAD.top + plotH / 2}
              class="axis-title" text-anchor="middle"
              transform="rotate(-90,11,{PAD.top + plotH / 2})">f(x)</text>

        <!-- Clipped content -->
        <g clip-path="url(#clip3)">
          <!-- Tangent (green dashed) -->
          <polyline points={tanPoints} class="line-tan" />
          <!-- Secant (red) -->
          <polyline points={sekantePoints} class="line-sek" />
          <!-- Parabola -->
          <polyline points={funcPoints} class="line-func" />
        </g>

        <!-- P1 (base point, orange) -->
        <circle cx={px0.x} cy={px0.y} r="5" fill={C_PT0} />
        <text x={px0.x - 8} y={px0.y - 9}
              class="pt-lbl" text-anchor="middle">P₁</text>

        <!-- P2 (secant point, red) -->
        <circle cx={px1.x} cy={px1.y} r="5" fill={C_SEK} />
        <text x={px1.x + 8} y={px1.y - 9}
              class="pt-lbl" text-anchor="start">P₂</text>

        <!-- Legend -->
        <g transform="translate({PAD.left + 4},{PAD.top + 6})">
          <line x1="0" y1="6"  x2="18" y2="6"  stroke={C_FUNC} stroke-width="2.2" />
          <text x="22" y="10" class="leg-txt">f(x)</text>
          <line x1="0" y1="20" x2="18" y2="20" stroke={C_SEK} stroke-width="1.8" />
          <text x="22" y="24" class="leg-txt">Secant (Δx={selectedDx})</text>
          <line x1="0" y1="34" x2="18" y2="34"
                stroke={C_TAN} stroke-width="1.8" stroke-dasharray="5 3" />
          <text x="22" y="38" class="leg-txt">Tangent</text>
        </g>

      </svg>
    </div>

  </div>

  <!-- ── Info tile ──────────────────────────────────────────────────────────── -->
  <div class="info-bar">
    <div class="info-tile">
      <span class="info-lbl">Base point x₀</span>
      <span class="info-val">{x0.toFixed(1)} cm</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">Selected Δx</span>
      <span class="info-val" style="color:{C_SEK}">{selectedDx}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">Secant slope Δf / Δx</span>
      <span class="info-val" style="color:{errColor(rows[selectedIdx].dq)}">
        {fmt(rows[selectedIdx].dq, 4)}
      </span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">Tangent slope f ′(x₀)</span>
      <span class="info-val" style="color:{C_TAN}">{fmt(analytical, 3)}</span>
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
    --hi-bg:     #fff8e1;
    --hi-border: #f0b800;
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
    max-width: 820px;
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

  /* ── x0 slider bar ───────────────────────────────────────────────────────── */
  .x0-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-wrap: wrap;
  }
  .x0-bar label {
    font-family: var(--font-ui);
    font-size: .85rem;
    font-style: italic;
    color: var(--muted);
    min-width: 20px;
  }
  .x0-bar input[type=range] {
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
    min-width: 58px;
  }
  .deriv-hint {
    font-family: var(--font-ui);
    font-size: .82rem;
    color: #1a8a1a;
    font-weight: 600;
    margin-left: 8px;
  }

  /* ── Two panels ──────────────────────────────────────────────────────────── */
  .panels {
    display: flex;
    gap: 0;
    align-items: flex-start;
  }
  @media (max-width: 600px) {
    .panels { flex-direction: column; }
  }

  .panel {
    flex: 1;
    padding: 16px 18px;
    border-right: 1px solid var(--border);
  }
  .panel:last-child { border-right: none; }

  .panel h2 {
    font-size: .82rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--muted);
    margin-bottom: 10px;
  }

  /* ── Table ───────────────────────────────────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-ui);
    font-size: .78rem;
  }
  thead th {
    background: #f0f0ea;
    border: 1px solid var(--border);
    padding: 5px 8px;
    text-align: right;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: .03em;
  }
  thead th:first-child { text-align: center; }

  tbody tr {
    cursor: pointer;
    transition: background .12s;
  }
  tbody tr:hover { background: #f7f6ef; }
  tbody tr.selected {
    background: var(--hi-bg);
    outline: 2px solid var(--hi-border);
    outline-offset: -1px;
  }

  tbody td {
    border: 1px solid var(--border);
    padding: 4px 8px;
    text-align: right;
  }
  tbody td:first-child { text-align: center; font-weight: 600; }

  .mono { font-variant-numeric: tabular-nums; }
  .dq   { font-weight: 700; }

  tfoot .foot-row td {
    padding: 6px 10px;
    font-family: var(--font-ui);
    font-size: .78rem;
    color: #1a8a1a;
    background: #f0f9f0;
    border: 1px solid #c8e6c8;
    text-align: center;
  }

  /* ── Δx button row ───────────────────────────────────────────────────────── */
  .dx-btns {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 10px;
  }
  .preset-lbl {
    font-family: var(--font-ui);
    font-size: .74rem;
    color: var(--muted);
  }
  button {
    font-family: var(--font-ui);
    font-size: .76rem;
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    cursor: pointer;
    color: var(--text);
    transition: background .14s, border-color .14s;
  }
  button:hover  { background: #f0ede0; border-color: #bbb; }
  button.active { background: #e60000; color: #fff; border-color: #e60000; }

  /* ── Graph panel ─────────────────────────────────────────────────────────── */
  .panel-graph svg { width: 100%; height: auto; display: block; }

  /* SVG element styles */
  .grid-line  { stroke: #e8e8e0; stroke-width: .8; }
  .axis       { stroke: #aaa;    stroke-width: 1.2; }
  .tick-lbl   { font-family: 'Helvetica Neue', sans-serif; font-size: 9px; fill: #888; }
  .axis-title { font-family: 'Helvetica Neue', sans-serif; font-size: 9px; fill: #888; font-style: italic; }
  .pt-lbl     { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; fill: #333; font-weight: 700; }
  .leg-txt    { font-family: 'Helvetica Neue', sans-serif; font-size: 9px; fill: #333; dominant-baseline: middle; }

  .line-func {
    fill: none; stroke: #005a94;
    stroke-width: 2.2; stroke-linejoin: round;
  }
  .line-sek {
    fill: none; stroke: #e60000;
    stroke-width: 1.8; stroke-linejoin: round;
  }
  .line-tan {
    fill: none; stroke: #1a8a1a;
    stroke-width: 1.8; stroke-dasharray: 7 4;
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
    min-width: 140px;
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }
  .info-lbl {
    font-family: var(--font-ui);
    font-size: .68rem;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--muted);
  }
  .info-val {
    font-family: var(--font-ui);
    font-size: 1.05rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>