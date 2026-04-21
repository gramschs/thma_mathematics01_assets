<!--
  ═══════════════════════════════════════════════════════════════════════════════
  App.svelte  -  App 3: Damped Oscillator
  Shows x(t) = A e^{−δt} cos(ω_d t) together with the exponential envelope
  ±A e^{−δt}.  Two sliders vary A (initial displacement, m) and δ (damping
  exponent, s⁻¹).  The damped frequency ω_d = 3 rad/s is kept fixed, matching
  the textbook example in section 6.3.
  ═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── SVG viewport ──────────────────────────────────────────────────────────
  const VW    = 600;
  const VH    = 360;
  const PAD   = { top: 24, right: 20, bottom: 50, left: 56 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // ── Math domain ───────────────────────────────────────────────────────────
  const tMin    =  0;
  const tMax    = 10;     // s — 10 s covers ~4.8 periods at ω_d = 3 rad/s
  const yMin    = -0.23;
  const yMax    =  0.23;
  const omega_d =  3;     // rad/s — fixed, as in section 6.3

  // ── Coordinate transforms (math → SVG pixels) ────────────────────────────
  const toSvgX = t => PAD.left + (t - tMin) / (tMax - tMin) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // ── Dense sample for smooth curves ───────────────────────────────────────
  const N  = 500;
  const ts = Array.from({ length: N }, (_, i) => tMin + i * (tMax - tMin) / (N - 1));

  // ── Axis ticks ────────────────────────────────────────────────────────────
  const xTickData = [0, 2, 4, 6, 8, 10].map(v => ({ val: v, label: String(v) }));
  const yTicks    = [-0.20, -0.10, 0.10, 0.20];

  // ── Color constants (matching TikZ palette and App 1–2 conventions) ───────
  const C_DISP = '#005a94';   // my_darkblue  – displacement x(t)
  const C_ENV  = '#e87846';   // my_orange    – exponential envelope ±A e^{−δt}
  const C_DOT  = '#005a94';   // my_darkblue  – initial-condition marker

  // ── Reactive slider state ─────────────────────────────────────────────────
  let A     = 0.10;   // initial displacement [m],   range 0.02 … 0.20
  let delta = 0.50;   // damping exponent     [s⁻¹], range 0.10 … 2.00

  // ── Reactive derived quantities ───────────────────────────────────────────
  // Half-life of the amplitude envelope: A e^{−δ t₁/₂} = A/2  ⟹  t₁/₂ = ln2 / δ
  $: halfLife = (Math.log(2) / delta).toFixed(2);

  // Initial velocity from section 6.3: v(0) = −A δ (the cos term dominates at t = 0)
  $: v0 = (-A * delta).toFixed(3);

  // Polyline point strings – recomputed whenever A or delta changes
  $: dispPoints = ts.map(t =>
    `${toSvgX(t)},${toSvgY(A * Math.exp(-delta * t) * Math.cos(omega_d * t))}`
  ).join(' ');

  $: envPosPoints = ts.map(t =>
    `${toSvgX(t)},${toSvgY( A * Math.exp(-delta * t))}`
  ).join(' ');

  $: envNegPoints = ts.map(t =>
    `${toSvgX(t)},${toSvgY(-A * Math.exp(-delta * t))}`
  ).join(' ');

  // SVG position of the initial-condition dot at (t=0, x=A)
  $: ptInit = { x: toSvgX(0), y: toSvgY(A) };

  onMount(() => {});
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App – Damped Oscillator</h1>
    <p>
      Position of a mass–spring–damper system:
      <em>x</em>(<em>t</em>) = <em>A</em> e<sup>−δ<em>t</em></sup>
      cos(ω<sub>d</sub> <em>t</em>), with ω<sub>d</sub> = 3 rad/s fixed.
      Adjust <em>A</em> (initial displacement) and δ (damping exponent) to see
      how the amplitude decays. The orange dashed curves are the
      envelope ±<em>A</em> e<sup>−δ<em>t</em></sup>.
    </p>
  </header>

  <!-- SVG chart -->
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Interactive damped oscillator visualisation">

      <defs>
        <clipPath id="plot-area-3">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      <!-- ── Grid ──────────────────────────────────────────────────────────── -->
      {#each xTickData as t}
        <line x1={toSvgX(t.val)} y1={PAD.top}
              x2={toSvgX(t.val)} y2={PAD.top + plotH} class="grid-line" />
      {/each}
      {#each yTicks as ty}
        <line x1={PAD.left}         y1={toSvgY(ty)}
              x2={PAD.left + plotW} y2={toSvgY(ty)} class="grid-line" />
      {/each}

      <!-- ── Axes ───────────────────────────────────────────────────────────── -->
      <!-- Horizontal: equilibrium line at x = 0 -->
      <line x1={PAD.left}         y1={toSvgY(0)}
            x2={PAD.left + plotW} y2={toSvgY(0)} class="axis" />
      <!-- Vertical: time origin at t = 0 -->
      <line x1={toSvgX(0)} y1={PAD.top}
            x2={toSvgX(0)} y2={PAD.top + plotH} class="axis" />

      <!-- ── Tick labels ────────────────────────────────────────────────────── -->
      {#each xTickData as t}
        <text x={toSvgX(t.val)} y={PAD.top + plotH + 18}
              class="tick-label" text-anchor="middle">{t.label}</text>
      {/each}
      {#each yTicks as ty}
        <text x={PAD.left - 8} y={toSvgY(ty)}
              class="tick-label" text-anchor="end"
              dominant-baseline="middle">{ty.toFixed(2)}</text>
      {/each}

      <!-- Axis titles -->
      <text x={PAD.left + plotW / 2} y={VH - 4}
            class="axis-title" text-anchor="middle">t (s)</text>
      <text x={13} y={PAD.top + plotH / 2}
            class="axis-title" text-anchor="middle"
            transform="rotate(-90,13,{PAD.top + plotH / 2})">x (m)</text>

      <!-- ══ Clipped plot group ════════════════════════════════════════════ -->
      <g clip-path="url(#plot-area-3)">

        <!-- Envelope ±A e^{−δt} (drawn first so x(t) sits on top) -->
        <polyline points={envPosPoints} class="line-env" />
        <polyline points={envNegPoints} class="line-env" />

        <!-- Displacement x(t) = A e^{−δt} cos(ω_d t) -->
        <polyline points={dispPoints} class="line-disp" />

      </g>
      <!-- ══ End clipped group ═════════════════════════════════════════════ -->

      <!-- Initial-condition marker at (0, A) — drawn outside clip so it is never cut -->
      <circle cx={ptInit.x} cy={ptInit.y} r="5.5" fill={C_DOT} />
      <text x={ptInit.x + 10} y={ptInit.y - 9} class="point-lbl">
        x(0) = {A.toFixed(2)} m
      </text>

      <!-- Legend -->
      <g transform="translate({PAD.left + 10},{PAD.top + 10})">
        <line x1="0" y1="8"  x2="22" y2="8"  stroke={C_DISP} stroke-width="2.5" />
        <text x="28" y="12" class="legend-txt">x(t)  —  displacement</text>
        <line x1="0" y1="26" x2="22" y2="26"
              stroke={C_ENV} stroke-width="2" stroke-dasharray="6 3" />
        <text x="28" y="30" class="legend-txt">±A e<tspan dy="-4" font-size="8">−δt</tspan><tspan dy="4">  —  envelope</tspan></text>
      </g>

    </svg>
  </div>

  <!-- ── Controls ─────────────────────────────────────────────────────────── -->
  <div class="controls">

    <!-- A slider -->
    <div class="slider-row">
      <label for="sl-A"><em>A</em></label>
      <input id="sl-A" type="range"
             min="0.02" max="0.20" step="0.01"
             bind:value={A} />
      <span class="sl-val">{A.toFixed(2)} m</span>
    </div>

    <!-- δ slider -->
    <div class="slider-row">
      <label for="sl-delta">δ</label>
      <input id="sl-delta" type="range"
             min="0.10" max="2.00" step="0.05"
             bind:value={delta} />
      <span class="sl-val">{delta.toFixed(2)} s⁻¹</span>
    </div>

  </div>

  <!-- ── Info tiles ────────────────────────────────────────────────────────── -->
  <div class="info-bar">

    <div class="info-tile">
      <span class="info-lbl">A (m)</span>
      <span class="info-val">{A.toFixed(2)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">δ (s⁻¹)</span>
      <span class="info-val">{delta.toFixed(2)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Half-life t½ (s)</span>
      <span class="info-val">{halfLife}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">v(0) (m/s)</span>
      <span class="info-val">{v0}</span>
    </div>

  </div>

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
    color-scheme: light;   /* ← neu: native Controls immer im Light-Mode */
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
    color: var(--text);   /* ← neu: explizit, schlägt die globale Regel */
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

  /* SVG element classes */
  .grid-line { stroke: #e8e8e0; stroke-width: 1; }
  .axis      { stroke: #aaa;    stroke-width: 1.5; }

  .tick-label {
    font-family: var(--font-ui);
    font-size: 10px;
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
    font-size: 11px;
    fill: #333;
    font-weight: 700;
  }
  .legend-txt {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: var(--text);
    dominant-baseline: middle;
  }

  /* Curve styles */
  .line-disp {
    fill: none;
    stroke: #005a94;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .line-env {
    fill: none;
    stroke: #e87846;
    stroke-width: 1.8;
    stroke-linejoin: round;
    stroke-dasharray: 7 4;
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
    accent-color: #005a94;
    cursor: pointer;
    height: 6px;
  }
  .sl-val {
    min-width: 72px;
    font-weight: 700;
    font-size: .95rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #333;
  }

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
    font-size: 1.1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
