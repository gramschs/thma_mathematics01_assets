<!--
  ═══════════════════════════════════════════════════════════════════════════════
  App.svelte  –  App 2: Sine Derivative Explorer
  Shows sin(x) and cos(x) over [−2π, 2π]. A draggable x₀ controls a tangent
  line to sin(x). The slope of that tangent always equals cos(x₀), making
  the identity (sin x)′ = cos x visible and interactive.
  ═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── SVG viewport ──────────────────────────────────────────────────────────
  const VW = 600;
  const VH = 360;
  const PAD = { top: 24, right: 20, bottom: 50, left: 50 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // ── Math domain ───────────────────────────────────────────────────────────
  const PI    = Math.PI;
  const xMin  = -2 * PI;
  const xMax  =  2 * PI;
  const yMin  = -1.7;
  const yMax  =  1.7;

  // ── Coordinate transforms (math → SVG pixels) ────────────────────────────
  const toSvgX = x => PAD.left + (x - xMin) / (xMax - xMin) * plotW;
  const toSvgY = y => PAD.top  + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // ── Dense sample for smooth curves ───────────────────────────────────────
  const N  = 400;
  const xs = Array.from({ length: N }, (_, i) => xMin + i * (xMax - xMin) / (N - 1));

  // ── Axis ticks ────────────────────────────────────────────────────────────
  const xTickData = [
    { val: -2 * PI, label: '−2π' },
    { val: -1.5*PI, label: '−3π/2' },
    { val: -PI,     label: '−π' },
    { val: -0.5*PI, label: '−π/2' },
    { val:  0,      label: '0' },
    { val:  0.5*PI, label: 'π/2' },
    { val:  PI,     label: 'π' },
    { val:  1.5*PI, label: '3π/2' },
    { val:  2 * PI, label: '2π' },
  ];
  const yTicks = [-1, -0.5, 0.5, 1];

  // ── Color constants (matching TikZ palette and App 1 conventions) ─────────
  const C_SIN  = '#005a94';   // my_darkblue  – sin curve (primary)
  const C_COS  = '#e60000';   // my_red       – cos curve (secondary)
  const C_TAN  = '#e87846';   // my_orange    – tangent line
  const C_PT   = '#e87846';   // my_orange    – base point on sin
  const C_LINK = '#888888';   // neutral gray – dashed vertical link

  // ── Reactive state ────────────────────────────────────────────────────────
  let x0 = 0;   // slider range [−2π, 2π], step 0.05

  // ── Reactive derived quantities ───────────────────────────────────────────
  $: sinX0  = Math.sin(x0);
  $: cosX0  = Math.cos(x0);
  $: slope  = cosX0;          // (sin x)′ = cos x

  // Polyline strings for sin and cos
  $: sinPoints = xs.map(x => `${toSvgX(x)},${toSvgY(Math.sin(x))}`).join(' ');
  $: cosPoints = xs.map(x => `${toSvgX(x)},${toSvgY(Math.cos(x))}`).join(' ');

  // Tangent line to sin at x0, extended 1.4 units on each side
  $: tangentPoints = (() => {
    const ext = 1.4;
    const xL  = x0 - ext;
    const xR  = x0 + ext;
    const tan = x => sinX0 + slope * (x - x0);
    return `${toSvgX(xL)},${toSvgY(tan(xL))} ${toSvgX(xR)},${toSvgY(tan(xR))}`;
  })();

  // SVG pixel positions of the two marked points
  $: ptSin = { x: toSvgX(x0), y: toSvgY(sinX0) };
  $: ptCos = { x: toSvgX(x0), y: toSvgY(cosX0) };

  // Color coding: slope positive → green-ish, negative → red-ish
  $: slopeColor = slope < 0 ? '#c8000a' : '#1a7a1a';

  // Human-readable x₀ label in units of π
  $: x0Label = (() => {
    const k = x0 / PI;
    if (Math.abs(k) < 0.02)         return '0';
    if (Math.abs(k - 1)  < 0.02)    return 'π';
    if (Math.abs(k + 1)  < 0.02)    return '−π';
    if (Math.abs(k - 0.5) < 0.02)   return 'π/2';
    if (Math.abs(k + 0.5) < 0.02)   return '−π/2';
    if (Math.abs(k - 2)   < 0.02)   return '2π';
    if (Math.abs(k + 2)   < 0.02)   return '−2π';
    return `${k.toFixed(2)}π`;
  })();

  // ── Preset jump points ────────────────────────────────────────────────────
  const presets = [
    { val: 0,         label: '0'    },
    { val:  PI / 2,   label: 'π/2'  },
    { val:  PI,       label: 'π'    },
    { val: -PI / 2,   label: '−π/2' },
    { val: -PI,       label: '−π'   },
  ];

  onMount(() => {});
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App 2 – Sine Derivative Explorer</h1>
    <p>
      Drag the slider to move x₀. The orange tangent line touches sin(x) at that point.
      Its slope always equals cos(x₀) — confirming (sin x)′ = cos x.
    </p>
  </header>

  <!-- SVG chart -->
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Interactive sine derivative visualisation">

      <defs>
        <clipPath id="plot-area-2">
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
      <line x1={PAD.left}         y1={toSvgY(0)}
            x2={PAD.left + plotW} y2={toSvgY(0)} class="axis" />
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
              dominant-baseline="middle">{ty}</text>
      {/each}

      <!-- Axis titles -->
      <text x={PAD.left + plotW / 2} y={VH - 4}
            class="axis-title" text-anchor="middle">x</text>
      <text x={14} y={PAD.top + plotH / 2}
            class="axis-title" text-anchor="middle"
            transform="rotate(-90,14,{PAD.top + plotH / 2})">y</text>

      <!-- ══ Clipped plot group ════════════════════════════════════════════ -->
      <g clip-path="url(#plot-area-2)">

        <!-- cos(x) curve (dashed, drawn first so sin sits on top) -->
        <polyline points={cosPoints} class="line-cos" />

        <!-- Tangent line to sin at x0 -->
        <polyline points={tangentPoints} class="line-tan" />

        <!-- sin(x) curve -->
        <polyline points={sinPoints} class="line-sin" />

        <!-- Vertical dashed link between the two marked points -->
        <line x1={ptSin.x} y1={ptSin.y}
              x2={ptCos.x} y2={ptCos.y}
              class="link-line" />

        <!-- Vertical marker line at x0 on the x-axis -->
        <line x1={toSvgX(x0)} y1={toSvgY(0) - 6}
              x2={toSvgX(x0)} y2={toSvgY(0) + 6}
              stroke={C_TAN} stroke-width="2" />

      </g>
      <!-- ══ End clipped group ═════════════════════════════════════════════ -->

      <!-- Base point on sin (outside clip so it never gets cut off) -->
      <circle cx={ptSin.x} cy={ptSin.y} r="6" fill={C_PT} />
      <text x={ptSin.x + 10} y={ptSin.y - 9}
            class="point-lbl">sin(x₀) = {sinX0.toFixed(3)}</text>

      <!-- Corresponding point on cos -->
      <circle cx={ptCos.x} cy={ptCos.y} r="5" fill={C_COS} />
      <text x={ptCos.x + 10} y={ptCos.y + 14}
            class="point-lbl" style="fill:{C_COS}">cos(x₀) = {cosX0.toFixed(3)}</text>

      <!-- Legend -->
      <g transform="translate({PAD.left + 8},{PAD.top + 10})">
        <line x1="0" y1="8"  x2="24" y2="8"  stroke={C_SIN} stroke-width="2.5" />
        <text x="30" y="12" class="legend-txt">sin x</text>
        <line x1="0" y1="26" x2="24" y2="26" stroke={C_COS} stroke-width="2"
              stroke-dasharray="6 3" />
        <text x="30" y="30" class="legend-txt">cos x</text>
        <line x1="0" y1="44" x2="24" y2="44" stroke={C_TAN} stroke-width="2" />
        <text x="30" y="48" class="legend-txt">tangent to sin at x₀</text>
      </g>

    </svg>
  </div>

  <!-- ── Controls ─────────────────────────────────────────────────────────── -->
  <div class="controls">

    <!-- x₀ slider -->
    <div class="slider-row">
      <label for="sl-x0">x₀</label>
      <input id="sl-x0" type="range"
             min={-2 * Math.PI} max={2 * Math.PI} step={0.05}
             bind:value={x0} />
      <span class="sl-val">{x0Label}</span>
    </div>

    <!-- Preset jump buttons -->
    <div class="presets">
      <span class="preset-lbl">Jump to:</span>
      {#each presets as p}
        <button
          class:active={Math.abs(x0 - p.val) < 0.03}
          on:click={() => x0 = p.val}
        >{p.label}</button>
      {/each}
    </div>

  </div>

  <!-- ── Info tiles ────────────────────────────────────────────────────────── -->
  <div class="info-bar">

    <div class="info-tile">
      <span class="info-lbl">x₀</span>
      <span class="info-val">{x0Label}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">sin(x₀)</span>
      <span class="info-val">{sinX0.toFixed(3)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">Tangent slope</span>
      <span class="info-val" style="color:{slopeColor}">{slope.toFixed(3)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">cos(x₀)</span>
      <span class="info-val" style="color:{slopeColor}">{cosX0.toFixed(3)}</span>
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
  .line-sin {
    fill: none;
    stroke: #005a94;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .line-cos {
    fill: none;
    stroke: #e60000;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-dasharray: 7 4;
  }
  .line-tan {
    fill: none;
    stroke: #e87846;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .link-line {
    stroke: #888;
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
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
    min-width: 64px;
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
  button.active { background: #005a94; color: #fff; border-color: #005a94; }

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
