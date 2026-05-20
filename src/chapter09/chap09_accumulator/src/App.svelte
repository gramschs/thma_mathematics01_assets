<!--
  ═══════════════════════════════════════════════════════════════════════════════
  App.svelte  –  App: FTC Accumulator
  Top panel: a(t) with oriented shaded area  ∫₀ᵗ a(τ) dτ.
  Bottom panel: accumulator v(t) = ∫₀ᵗ a(τ) dτ  growing as t increases.
  ═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── Shared SVG viewport ──────────────────────────────────────────────────
  const VW    = 600;
  const VH    = 175;                                    // reduced from 215
  const PAD   = { top: 22, right: 22, bottom: 42, left: 60 };
  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top  - PAD.bottom;

  // ── Math domains ─────────────────────────────────────────────────────────
  const tMin = 0;     const tMax = 10;
  const aMin = -0.44; const aMax =  0.72;
  const vMin = -0.15; const vMax =  1.78;

  // ── Coordinate transforms (math → SVG pixels) ────────────────────────────
  const toX  = t => PAD.left + (t - tMin) / (tMax - tMin) * plotW;
  const toAY = a => PAD.top  + (1 - (a - aMin) / (aMax - aMin)) * plotH;
  const toVY = v => PAD.top  + (1 - (v - vMin) / (vMax - vMin)) * plotH;

  // ── Physics ──────────────────────────────────────────────────────────────
  function accel(t) {
    if (t <= 3) return  0.50;
    if (t <= 5) return  0.00;
    return -0.20;
  }

  function velocity(t) {
    if (t <= 0) return 0;
    if (t <= 3) return  0.50 * t;
    if (t <= 5) return  1.50;
    return 1.50 - 0.20 * (t - 5);
  }

  function phaseName(t) {
    if (t <  3) return 'Speed up';
    if (t <= 5) return 'Cruise';
    return 'Brake';
  }

  // ── Colors (TikZ palette) ────────────────────────────────────────────────
  const C_DARK_BLUE  = '#005a94';
  const C_LIGHT_BLUE = '#CCDEE9';
  const C_RED        = '#E60000';
  const C_ORANGE     = '#E87846';
  const C_DARK_GRAY  = '#484949';
  const C_LIGHT_GRAY = '#F3F4F4';

  // ── Tick data ─────────────────────────────────────────────────────────────
  const xTicks = [0, 2, 4, 6, 8, 10];
  const aTicks = [-0.2, 0.0, 0.2, 0.4];
  const vTicks = [0.0, 0.5, 1.0, 1.5];

  // ── Static geometry ───────────────────────────────────────────────────────
  const aStepPts = [
    [0, 0.5], [3, 0.5], [3, 0.0], [5, 0.0], [5, -0.2], [10, -0.2]
  ].map(([t, a]) => `${toX(t)},${toAY(a)}`).join(' ');

  // Legend position: right side of top panel
  const legendX = PAD.left + plotW - 128;
  const legendY = PAD.top + 8;

  // ── Reactive slider state ─────────────────────────────────────────────────
  let T = 0;

  // ── Animation ─────────────────────────────────────────────────────────────
  let playing   = false;
  let animId    = null;
  let lastStamp = null;
  const SPEED   = 1.5;

  function togglePlay() {
    if (playing) {
      playing = false;
      if (animId) cancelAnimationFrame(animId);
      lastStamp = null;
    } else {
      if (T >= tMax) T = 0;
      playing = true;
      lastStamp = null;
      animId = requestAnimationFrame(animStep);
    }
  }

  function animStep(stamp) {
    if (!playing) return;
    if (lastStamp !== null) {
      T = Math.min(T + SPEED * (stamp - lastStamp) / 1000, tMax);
    }
    lastStamp = stamp;
    if (T < tMax) {
      animId = requestAnimationFrame(animStep);
    } else {
      playing = false;
      lastStamp = null;
    }
  }

  // ── Reactive derived quantities ───────────────────────────────────────────
  $: aT = accel(T);
  $: vT = velocity(T);
  $: markerX = toX(T);

  $: posAreaPts = (() => {
    if (T <= 0) return null;
    const te = Math.min(T, 3);
    return `${toX(0)},${toAY(0)} ${toX(0)},${toAY(0.5)} ${toX(te)},${toAY(0.5)} ${toX(te)},${toAY(0)}`;
  })();

  $: negAreaPts = (() => {
    if (T <= 5) return null;
    const te = Math.min(T, 10);
    return `${toX(5)},${toAY(0)} ${toX(5)},${toAY(-0.2)} ${toX(te)},${toAY(-0.2)} ${toX(te)},${toAY(0)}`;
  })();

  $: vDrawnPts = (() => {
    if (T <= 0) return `${toX(0)},${toVY(0)}`;
    const pts = [[0, 0]];
    if      (T <= 3) { pts.push([T, velocity(T)]); }
    else if (T <= 5) { pts.push([3, 1.5], [T, 1.5]); }
    else             { pts.push([3, 1.5], [5, 1.5], [T, velocity(T)]); }
    return pts.map(([t, v]) => `${toX(t)},${toVY(v)}`).join(' ');
  })();

  $: labelAnchor = T > 7.5 ? 'end' : 'start';
  $: labelOffX   = T > 7.5 ? -9 : 9;

  onMount(() => {});
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet">

  <!-- Header -->
  <header>
    <h1>App – FTC Accumulator: velocity from acceleration</h1>
    <p>Drag <em>t</em> or press Play — watch the shaded area grow into the velocity curve below.</p>
  </header>

  <!-- ── Top SVG: a(t) with shaded area ───────────────────────────────────── -->
  <div class="chart-wrap">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Acceleration a(t) with oriented shaded area">

      <defs>
        <clipPath id="clip-a">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      <rect width={VW} height={VH} fill={C_LIGHT_GRAY} />

      <!-- Grid -->
      {#each xTicks as tv}
        <line x1={toX(tv)} y1={PAD.top}
              x2={toX(tv)} y2={PAD.top + plotH} class="grid-line" />
      {/each}
      {#each aTicks as av}
        <line x1={PAD.left} y1={toAY(av)}
              x2={PAD.left + plotW} y2={toAY(av)} class="grid-line" />
      {/each}

      <!-- Phase boundaries -->
      {#each [3, 5] as tp}
        <line x1={toX(tp)} y1={PAD.top}
              x2={toX(tp)} y2={PAD.top + plotH}
              stroke={C_DARK_GRAY} stroke-width="1.2" stroke-dasharray="5 4" />
      {/each}

      <!-- Phase labels -->
      <text x={(toX(0) + toX(3)) / 2} y={PAD.top + plotH - 6}
            class="phase-lbl" text-anchor="middle">Speed up</text>
      <text x={(toX(3) + toX(5)) / 2} y={PAD.top + plotH - 6}
            class="phase-lbl" text-anchor="middle">Cruise</text>
      <text x={(toX(5) + toX(10)) / 2} y={PAD.top + plotH - 6}
            class="phase-lbl" text-anchor="middle">Brake</text>

      <!-- Axes -->
      <line x1={PAD.left}         y1={toAY(0)}
            x2={PAD.left + plotW} y2={toAY(0)} class="axis" />
      <line x1={toX(0)} y1={PAD.top}
            x2={toX(0)} y2={PAD.top + plotH} class="axis" />

      <!-- Clipped plot group -->
      <g clip-path="url(#clip-a)">

        {#if posAreaPts}
          <polygon points={posAreaPts} fill={C_LIGHT_BLUE} fill-opacity="0.92" stroke="none" />
        {/if}
        {#if negAreaPts}
          <polygon points={negAreaPts} fill={C_RED} fill-opacity="0.22" stroke="none" />
        {/if}

        <line x1={markerX} y1={PAD.top}
              x2={markerX} y2={PAD.top + plotH}
              stroke={C_ORANGE} stroke-width="2" stroke-dasharray="6 3" />

        <polyline points={aStepPts} class="line-curve" />

        <circle cx={markerX} cy={toAY(aT)} r="5.5" fill={C_ORANGE} />

      </g>

      <!-- Tick labels -->
      {#each xTicks as tv}
        <text x={toX(tv)} y={PAD.top + plotH + 15}
              class="tick-label" text-anchor="middle">{tv}</text>
      {/each}
      {#each aTicks as av}
        <text x={PAD.left - 8} y={toAY(av)}
              class="tick-label" text-anchor="end" dominant-baseline="middle">
          {av.toFixed(1)}
        </text>
      {/each}

      <!-- Axis titles -->
      <text x={PAD.left + plotW / 2} y={VH - 4}
            class="axis-title" text-anchor="middle">t [s]</text>
      <text x="15" y={PAD.top + plotH / 2}
            class="axis-title" text-anchor="middle"
            transform="rotate(-90,15,{PAD.top + plotH / 2})">a [m/s²]</text>

      <!-- Legend: right side to avoid overlap with y-axis -->
      <g transform="translate({legendX},{legendY})">
        <line x1="0" y1="7" x2="20" y2="7"
              stroke={C_DARK_BLUE} stroke-width="2.5" />
        <text x="26" y="11" class="legend-txt">a(t)</text>
        <rect x="0" y="18" width="20" height="10"
              fill={C_LIGHT_BLUE} fill-opacity="0.92" />
        <text x="26" y="27" class="legend-txt">positive area</text>
        <rect x="0" y="32" width="20" height="10"
              fill={C_RED} fill-opacity="0.22" />
        <text x="26" y="41" class="legend-txt">negative area</text>
      </g>

    </svg>
  </div>

  <!-- ── Bottom SVG: v(T) accumulator ─────────────────────────────────────── -->
  <div class="chart-wrap chart-wrap-bottom">
    <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Accumulator function v(T)">

      <defs>
        <clipPath id="clip-v">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      <rect width={VW} height={VH} fill={C_LIGHT_GRAY} />

      <!-- Grid -->
      {#each xTicks as tv}
        <line x1={toX(tv)} y1={PAD.top}
              x2={toX(tv)} y2={PAD.top + plotH} class="grid-line" />
      {/each}
      {#each vTicks as vv}
        <line x1={PAD.left} y1={toVY(vv)}
              x2={PAD.left + plotW} y2={toVY(vv)} class="grid-line" />
      {/each}

      <!-- Phase boundaries -->
      {#each [3, 5] as tp}
        <line x1={toX(tp)} y1={PAD.top}
              x2={toX(tp)} y2={PAD.top + plotH}
              stroke={C_DARK_GRAY} stroke-width="1.2" stroke-dasharray="5 4" />
      {/each}

      <!-- Axes -->
      <line x1={PAD.left}         y1={toVY(0)}
            x2={PAD.left + plotW} y2={toVY(0)} class="axis" />
      <line x1={toX(0)} y1={PAD.top}
            x2={toX(0)} y2={PAD.top + plotH} class="axis" />

      <!-- Clipped plot group -->
      <g clip-path="url(#clip-v)">

        <line x1={markerX} y1={PAD.top}
              x2={markerX} y2={PAD.top + plotH}
              stroke={C_ORANGE} stroke-width="2" stroke-dasharray="6 3" />

        <polyline points={vDrawnPts} class="line-curve" />

        {#if T > 0}
          <circle cx={markerX} cy={toVY(vT)} r="5.5" fill={C_ORANGE} />
          <text x={markerX + labelOffX} y={toVY(vT) - 10}
                class="point-lbl" text-anchor={labelAnchor}>
            v(t) = {vT.toFixed(3)} [m/s]
          </text>
        {/if}

      </g>

      <!-- Tick labels -->
      {#each xTicks as tv}
        <text x={toX(tv)} y={PAD.top + plotH + 15}
              class="tick-label" text-anchor="middle">{tv}</text>
      {/each}
      {#each vTicks as vv}
        <text x={PAD.left - 8} y={toVY(vv)}
              class="tick-label" text-anchor="end" dominant-baseline="middle">
          {vv.toFixed(1)}
        </text>
      {/each}

      <!-- Axis titles -->
      <text x={PAD.left + plotW / 2} y={VH - 4}
            class="axis-title" text-anchor="middle">t [s]</text>
      <text x="15" y={PAD.top + plotH / 2}
            class="axis-title" text-anchor="middle"
            transform="rotate(-90,15,{PAD.top + plotH / 2})">v [m/s]</text>

      <!-- Legend -->
      <g transform="translate({legendX},{legendY})">
        <line x1="0" y1="7" x2="20" y2="7"
              stroke={C_DARK_BLUE} stroke-width="2.5" />
        <text x="26" y="11" class="legend-txt">v(t) = ∫₀ᵗ a(τ) dτ</text>
      </g>

    </svg>
  </div>

  <!-- ── Controls ──────────────────────────────────────────────────────────── -->
  <div class="controls">

    <button class="play-btn" on:click={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}>
      {#if playing}
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="2" y="1" width="4" height="12" fill="currentColor" />
          <rect x="8" y="1" width="4" height="12" fill="currentColor" />
        </svg>
        Pause
      {:else}
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <polygon points="2,1 13,7 2,13" fill="currentColor" />
        </svg>
        Play
      {/if}
    </button>

    <div class="slider-row">
      <label for="sl-T"><em>t</em></label>
      <input id="sl-T" type="range"
             min="0" max="10" step="0.05"
             bind:value={T} />
      <span class="sl-val">{T.toFixed(2)} s</span>
    </div>

  </div>

  <!-- ── Info bar ──────────────────────────────────────────────────────────── -->
  <div class="info-bar">

    <div class="info-tile">
      <span class="info-lbl">t [s]</span>
      <span class="info-val">{T.toFixed(2)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">a(t) [m/s²]</span>
      <span class="info-val">{aT.toFixed(2)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">
        ∫<sub>0</sub><sup><em>t</em></sup> a(τ) dτ [m/s]
      </span>
      <span class="info-val">{vT.toFixed(3)}</span>
    </div>

    <div class="info-tile">
      <span class="info-lbl">phase</span>
      <span class="info-val info-val-text">{phaseName(T)}</span>
    </div>

  </div>

</div>


<!-- ══════════════════════════════════════════════════════════════════════════
     STYLES — scoped to this component
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
    --blue:      #005a94;
    --orange:    #E87846;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Container ──────────────────────────────────────────────────────────── */
  .applet {
    color-scheme: light;
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
    padding: 12px 24px 10px;
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
    margin-top: 4px;
    font-size: .82rem;
    font-family: var(--font-ui);
    color: var(--muted);
    line-height: 1.4;
  }

  /* ── Chart wrappers ─────────────────────────────────────────────────────── */
  .chart-wrap        { padding: 6px 20px 2px; background: var(--surface); }
  .chart-wrap-bottom { padding-top: 4px; border-top: 1px solid var(--border); }
  .chart-wrap svg    { width: 100%; height: auto; display: block; }

  /* ── SVG element classes ─────────────────────────────────────────────────── */
  .grid-line { stroke: #e0e1d8; stroke-width: 1; }
  .axis      { stroke: #aaa;    stroke-width: 1.5; }

  .tick-label {
    font-family: var(--font-ui);
    font-size: 10px;
    fill: #666660;
  }
  .axis-title {
    font-family: var(--font-ui);
    font-size: 12px;
    fill: #666660;
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
    fill: #1c1c1a;
    dominant-baseline: middle;
  }
  .phase-lbl {
    font-family: var(--font-ui);
    font-size: 10px;
    fill: #484949;
    font-style: italic;
  }

  .line-curve {
    fill: none;
    stroke: #005a94;
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  /* ── Controls ───────────────────────────────────────────────────────────── */
  .controls {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 24px;                /* reduced from 14px/12px */
    border-top: 1px solid var(--border);
    background: var(--surface);
  }

  .play-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    background: var(--blue);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-family: var(--font-ui);
    font-size: .82rem;
    font-weight: 600;
    letter-spacing: .03em;
    cursor: pointer;
    flex-shrink: 0;
    transition: background .15s;
  }
  .play-btn:hover  { background: #004a7a; }
  .play-btn:active { background: #003d66; }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    font-family: var(--font-ui);
    font-size: .85rem;
  }
  .slider-row label {
    min-width: 20px;
    color: var(--muted);
    font-style: italic;
  }
  .slider-row input[type=range] {
    flex: 1;
    accent-color: var(--blue);
    cursor: pointer;
    height: 6px;
  }
  .sl-val {
    min-width: 62px;
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
    padding: 9px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }

  .info-lbl {
    font-family: var(--font-ui);
    font-size: .70rem;
    letter-spacing: .02em;
    color: var(--muted);
    display: block;
    min-height: 2.6em;   /* absorbs sub+sup height in the integral tile */
  }
  .info-val {
    font-family: var(--font-ui);
    font-size: 1.08rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .info-val-text {
    font-size: .88rem;
    letter-spacing: .01em;
  }
</style>
