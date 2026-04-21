<!--
  ══════════════════════════════════════════════════════════════════════════════
  AppAnimation.svelte  –  Mass-spring-damper: animated introduction
  Left  : mechanical sketch (car body / spring / damper), vertically animated.
  Right : graph of x(t) drawn progressively in real time.
  The shared y-scale and the orange dashed line make the link explicit:
  the height of the car body IS the value plotted on the graph.
  Fixed: A = 0.10 m, delta = 0.5 s^-1, omega_d = 3 rad/s, T = 10 s.
  ══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { onMount } from 'svelte';

  // ── Physical constants (fixed for this animation) ─────────────────────────
  const A       = 0.10;   // initial displacement  [m]
  const DELTA   = 0.50;   // damping exponent      [s^-1]
  const OMEGA_D = 3.00;   // damped frequency      [rad/s]
  const T_MAX   = 10;     // time horizon          [s]

  // ── SVG canvas ────────────────────────────────────────────────────────────
  const W = 680;
  const H = 430;

  // ── Shared y-coordinate mapping ───────────────────────────────────────────
  // Positive x (car up)  → smaller SVG y (up on screen).
  // This SAME formula is used for both the car position and the graph y-axis,
  // which keeps the connecting dashed line perfectly horizontal.
  const Y_EQ   = 220;   // SVG y for x = 0  (equilibrium)
  const XSCALE = 570;   // SVG pixels per metre

  const my = x => Y_EQ - x * XSCALE;
  // my(+0.10) = 220 - 57 = 163  (car at initial displacement)
  // my(-0.10) = 220 + 57 = 277  (car below equilibrium)

  // ── Left panel – mechanical geometry ──────────────────────────────────────
  const GND_Y = 394;              // ground line y
  const CX    = 155;              // horizontal centre of mechanism
  const CAR_W = 130;              // car-body width  [px]
  const CAR_H = 46;               // car-body height [px]
  const SPR_X = CX - 40;         // 115 – spring centre-x
  const DMP_X = CX + 40;         // 195 – damper centre-x
  const CYL_H = 76;              // damper cylinder height [px]
  const CYL_T = GND_Y - CYL_H;  // 318 – cylinder top y
  const CYL_W = 24;              // cylinder width  [px]
  const ROD_W = 10;              // damper rod width [px]
  const ARR_X = 256;             // x(t) indicator arrow x

  // ── Right panel – graph geometry ──────────────────────────────────────────
  const GAXL = 353;                // x of graph y-axis line
  const GAXR = W - 20;            // 660 – right boundary
  const GW   = GAXR - GAXL;       // 307

  const toGX = t => GAXL + (t / T_MAX) * GW;
  // toGY(x) is simply my(x) — the shared y-scale is the key link

  const YTICKS = [-0.10, -0.05, 0, 0.05, 0.10];
  const TTICKS = [0, 2, 4, 6, 8, 10];

  // ── Colour palette (matches TikZ palette) ────────────────────────────────
  const CB  = '#005a94';   // my_darkblue  – structure, curve, labels
  const CO  = '#e87846';   // my_orange    – connecting line
  const CDG = '#484949';   // my_darkgray  – axes, secondary labels
  const CLB = '#ccdee9';   // my_lightblue – fills

  // ── Animation state ───────────────────────────────────────────────────────
  let t         = 0;
  let animating = false;
  let rafId     = null;
  let lastTs    = null;
  let appEl;

  // ── Reactive geometry (recomputed every frame) ────────────────────────────
  $: xt   = A * Math.exp(-DELTA * t) * Math.cos(OMEGA_D * t);
  $: cBot = my(xt);            // car-body bottom y  (= current graph dot y)
  $: cTop = cBot - CAR_H;
  $: cL   = CX - CAR_W / 2;   // 90 – left edge (constant; reactive for symmetry)
  $: gx   = toGX(t);           // graph dot x
  $: spts = mkSpring(SPR_X, cBot);
  $: gpts = mkGraph(t);

  // ── Spring polyline (zigzag, length proportional to car displacement) ─────
  function mkSpring(cx, topY) {
    const span = GND_Y - topY;
    const s    = span * 0.10;                     // straight lead-in
    const z    = span * 0.80;                     // zigzag zone
    const amp  = Math.max(6, span * 0.050);       // amplitude scales with span
    const N    = 12;                              // half-turns
    const pts  = [[cx, topY], [cx, topY + s]];
    for (let i = 0; i < N; i++)
      pts.push([cx + (i % 2 === 0 ? amp : -amp),
                topY + s + (i + 0.5) * z / N]);
    pts.push([cx, topY + s + z], [cx, GND_Y]);
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }

  // ── Progressive graph polyline (resampled up to current t) ───────────────
  function mkGraph(tc) {
    if (tc <= 0) return `${GAXL},${my(A).toFixed(1)}`;
    const N   = Math.max(4, Math.round(tc * 50));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const ti = (i / N) * tc;
      const xi = A * Math.exp(-DELTA * ti) * Math.cos(OMEGA_D * ti);
      pts.push(`${toGX(ti).toFixed(1)},${my(xi).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  function tick(ts) {
    if (!lastTs) lastTs = ts;
    t      = Math.min(t + (ts - lastTs) / 1000, T_MAX);
    lastTs = ts;
    if (t < T_MAX) {
      rafId = requestAnimationFrame(tick);
    } else {
      t = T_MAX; animating = false; lastTs = null;
    }
  }

  function play() {
    if (animating) return;
    animating = true; lastTs = null;
    rafId = requestAnimationFrame(tick);
  }

  function restart() {
    if (rafId) cancelAnimationFrame(rafId);
    animating = false; lastTs = null; t = 0;
    setTimeout(play, 40);
  }

  // Pause animation when user manually moves the slider
  function scrub() {
    if (!animating) return;
    cancelAnimationFrame(rafId);
    animating = false; lastTs = null;
  }

  // Auto-start when the component scrolls into view
  onMount(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { play(); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(appEl);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  });
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="applet" bind:this={appEl}>

  <!-- Header -->
  <header>
    <h1>App – Mass-Spring-Damper: Animated Introduction</h1>
    <p>
      A car body (mass <em>m</em>) rests on a spring (stiffness <em>k</em>) and
      a viscous damper (coefficient <em>d</em>) connected to a fixed ground.
      The body is displaced by <em>A</em> = 0.10 m and released. Watch how
      the height of the car traces the graph of
      <em>x</em>(<em>t</em>) = 0.10 e<sup>−0.5<em>t</em></sup> cos(3<em>t</em>)
      in real time — the orange dashed line makes this link explicit.
    </p>
  </header>

  <!-- Main SVG -->
  <div class="chart-wrap">
    <svg viewBox="0 70 {W} {H - 70}" preserveAspectRatio="xMidYMid meet"
         role="img"
         aria-label="Animated mass-spring-damper system on the left, displacement graph on the right">

      <defs>
        <!-- Arrowhead for x(t) indicator (orient=auto aligns with line direction) -->
        <marker id="arr" markerWidth="7" markerHeight="7"
                refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0.5 L 6 3.5 L 0 6.5 Z" fill="#005a94"/>
        </marker>
      </defs>

      <!-- ════════════════════════════════════════════════════════════════════
           LEFT PANEL – mechanical sketch
           ════════════════════════════════════════════════════════════════════ -->

      <!-- Fixed ground: horizontal line + hatching -->
      <line x1="76" y1={GND_Y} x2="240" y2={GND_Y}
            stroke={CDG} stroke-width="2.5"/>
      {#each Array.from({length: 11}) as _, i}
        <line x1={78 + i * 16}      y1={GND_Y}
              x2={78 + i * 16 - 10} y2={GND_Y + 11}
              stroke={CDG} stroke-width="1.1"/>
      {/each}

      <!-- Equilibrium reference line (dashed) -->
      <line x1="80" y1={Y_EQ} x2="272" y2={Y_EQ}
            stroke={CDG} stroke-width="1"
            stroke-dasharray="5 3" opacity="0.38"/>
      <text x="82" y={Y_EQ - 5}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="10" fill={CDG} opacity="0.52">equil.</text>

      <!-- ── Spring ─────────────────────────────────────────────────────── -->
      <polyline points={spts} fill="none"
                stroke={CB} stroke-width="2" stroke-linejoin="round"/>
      <!-- Label k -->
      <text x={SPR_X - 22} y={(cBot + GND_Y) / 2 + 5}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="15" fill={CB} font-style="italic"
            text-anchor="middle">k</text>

      <!-- ── Damper (piston-in-cylinder) ──────────────────────────────── -->
      <!-- Outer cylinder: fixed to ground -->
      <rect x={DMP_X - CYL_W / 2} y={CYL_T}
            width={CYL_W} height={CYL_H}
            fill={CLB} stroke={CB} stroke-width="1.8" rx="2"/>
      <!-- Rod: slides in cylinder, top attached to car body -->
      <rect x={DMP_X - ROD_W / 2} y={cBot}
            width={ROD_W} height={CYL_T - cBot}
            fill={CB} stroke="none"/>
      <!-- Cap: attachment point at car-body bottom -->
      <rect x={DMP_X - CYL_W / 2 - 1} y={cBot - 9}
            width={CYL_W + 2} height="9"
            fill={CB} stroke="none" rx="1"/>
      <!-- Label d -->
      <text x={DMP_X + 23} y={(CYL_T + GND_Y) / 2 + 5}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="15" fill={CB} font-style="italic"
            text-anchor="middle">d</text>

      <!-- ── Car body ──────────────────────────────────────────────────── -->
      <rect x={cL} y={cTop}
            width={CAR_W} height={CAR_H}
            fill={CLB} stroke={CB} stroke-width="2" rx="4"/>
      <!-- Label: "car body" -->
      <text x={CX} y={cTop + CAR_H * 0.40}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="10.5" fill={CDG} text-anchor="middle">car body</text>
      <!-- Label: italic m -->
      <text x={CX} y={cTop + CAR_H * 0.80}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="15" fill={CB} font-style="italic"
            text-anchor="middle">m</text>

      <!-- ── x(t) indicator ───────────────────────────────────────────── -->
      <!-- Equilibrium tick mark -->
      <line x1={ARR_X - 7} y1={Y_EQ} x2={ARR_X + 7} y2={Y_EQ}
            stroke={CDG} stroke-width="1.8"/>
      <!-- Arrow from equilibrium to current car position -->
      {#if Math.abs(xt) > 0.003}
        <line x1={ARR_X} y1={Y_EQ} x2={ARR_X} y2={cBot}
              stroke={CB} stroke-width="2"
              marker-end="url(#arr)"/>
      {/if}
      <!-- Label x(t) at midpoint of arrow -->
      <text x={ARR_X + 11} y={(Y_EQ + cBot) / 2 + 4}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="13" fill={CB} font-style="italic">x(t)</text>

      <!-- Panel divider -->
      <line x1="308" y1="16" x2="308" y2={H - 16}
            stroke="#ddddd0" stroke-width="1"/>

      <!-- ════════════════════════════════════════════════════════════════════
           CONNECTING LINE
           Both panels share the same y-mapping, so this line is always
           horizontal: the height of the car equals the graph y-value.
           ════════════════════════════════════════════════════════════════════ -->
      <line x1={cL + CAR_W + 5} y1={cBot} x2={gx} y2={cBot}
            stroke={CO} stroke-width="1.5"
            stroke-dasharray="6 3" opacity="0.88"/>

      <!-- ════════════════════════════════════════════════════════════════════
           RIGHT PANEL – graph of x(t)
           ════════════════════════════════════════════════════════════════════ -->

      <!-- Grid: y-direction (skip zero — coincides with t-axis) -->
      {#each YTICKS as yv}
        {#if yv !== 0}
          <line x1={GAXL} y1={my(yv)} x2={GAXR} y2={my(yv)}
                stroke="#e4e4dc" stroke-width="0.8"/>
        {/if}
      {/each}
      <!-- Grid: t-direction -->
      {#each TTICKS.slice(1) as tv}
        <line x1={toGX(tv)} y1={my(0.125)} x2={toGX(tv)} y2={my(-0.125)}
              stroke="#e4e4dc" stroke-width="0.8"/>
      {/each}

      <!-- t-axis (horizontal, at x = 0) -->
      <line x1={GAXL} y1={Y_EQ} x2={GAXR} y2={Y_EQ}
            stroke={CDG} stroke-width="1.5"/>
      <!-- x(t)-axis (vertical, at t = 0) -->
      <line x1={GAXL} y1={my(0.130)} x2={GAXL} y2={my(-0.130)}
            stroke={CDG} stroke-width="1.5"/>

      <!-- y-axis ticks and labels -->
      {#each YTICKS as yv}
        <line x1={GAXL - 4} y1={my(yv)} x2={GAXL} y2={my(yv)}
              stroke={CDG} stroke-width="1.5"/>
        <text x={GAXL - 7} y={my(yv)}
              font-family="Helvetica Neue,Arial,sans-serif"
              font-size="10.5" fill={CDG}
              text-anchor="end" dominant-baseline="middle">
          {yv === 0 ? '0' : yv.toFixed(2)}
        </text>
      {/each}

      <!-- t-axis ticks and labels -->
      {#each TTICKS as tv}
        <line x1={toGX(tv)} y1={Y_EQ} x2={toGX(tv)} y2={Y_EQ + 5}
              stroke={CDG} stroke-width="1.5"/>
        <text x={toGX(tv)} y={Y_EQ + 16}
              font-family="Helvetica Neue,Arial,sans-serif"
              font-size="10.5" fill={CDG} text-anchor="middle">{tv}</text>
      {/each}

      <!-- Axis titles -->
      <text x={GAXL + GW / 2} y={H - 10}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="13" fill={CDG} font-style="italic"
            text-anchor="middle">t (s)</text>
      <text x={GAXL - 35} y={Y_EQ}
            font-family="Helvetica Neue,Arial,sans-serif"
            font-size="13" fill={CDG} font-style="italic"
            text-anchor="middle"
            transform="rotate(-90 {GAXL - 35} {Y_EQ})">x(t) (m)</text>

      <!-- Progressive graph polyline (draws from left as t advances) -->
      <polyline points={gpts} fill="none"
                stroke={CB} stroke-width="2.5"
                stroke-linejoin="round"/>

      <!-- Current position dot (y = cBot, same as car body bottom) -->
      <circle cx={gx} cy={cBot} r="4.5" fill={CB}/>

      <!-- Legend -->
      <g transform="translate({GAXL + 8},{my(0.125) + 8})">
        <line x1="0" y1="7" x2="20" y2="7" stroke={CB} stroke-width="2.5"/>
        <text x="26" y="11"
              font-family="Helvetica Neue,Arial,sans-serif"
              font-size="11" fill={CDG}>x(t) — displacement</text>
      </g>

    </svg>
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="slider-row">
      <label for="sl-t"><em>t</em></label>
      <input id="sl-t" type="range"
             min="0" max={T_MAX} step="0.05"
             bind:value={t}
             on:input={scrub}/>
      <span class="sl-val">{t.toFixed(2)} s</span>
    </div>
    <button class="restart-btn" on:click={restart}>↺  Restart</button>
  </div>

  <!-- Info tiles -->
  <div class="info-bar">
    <div class="info-tile">
      <span class="info-lbl">A (m)</span>
      <span class="info-val">{A.toFixed(2)}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">δ (s⁻¹)</span>
      <span class="info-val">{DELTA.toFixed(2)}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">ω<sub>d</sub> (rad/s)</span>
      <span class="info-val">{OMEGA_D.toFixed(1)}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">t (s)</span>
      <span class="info-val">{t.toFixed(2)}</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">x(t) (m)</span>
      <span class="info-val">{xt.toFixed(4)}</span>
    </div>
  </div>

</div>


<!-- ══════════════════════════════════════════════════════════════════════════
     STYLES  –  identical design tokens to App.svelte
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
    color-scheme: light;
    font-family: var(--font-body);
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    max-width: 720px;
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
    color: var(--text);
  }
  header p {
    margin-top: 5px;
    font-size: .82rem;
    font-family: var(--font-ui);
    color: var(--muted);
    line-height: 1.5;
  }

  /* ── Chart ──────────────────────────────────────────────────────────────── */
  .chart-wrap     { padding: 12px 16px 0; background: var(--surface); }
  .chart-wrap svg { width: 100%; height: auto; display: block; }

  /* ── Controls ───────────────────────────────────────────────────────────── */
  .controls {
    padding: 14px 24px 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-top: 1px solid var(--border);
  }
  .slider-row {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
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
    accent-color: #005a94;
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
    font-family: var(--font-ui);
  }

  .restart-btn {
    padding: 7px 18px;
    font-family: var(--font-ui);
    font-size: .85rem;
    color: #005a94;
    background: transparent;
    border: 1px solid #005a94;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: background .15s, color .15s;
  }
  .restart-btn:hover  { background: #005a94; color: #fff; }
  .restart-btn:active { transform: scale(.97); }

  /* ── Info bar ────────────────────────────────────────────────────────────── */
  .info-bar {
    display: flex;
    border-top: 1px solid var(--border);
    background: #f3f4f6;
  }
  .info-tile {
    flex: 1;
    padding: 10px 14px;
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
