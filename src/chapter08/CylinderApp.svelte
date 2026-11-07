<!--
  ══════════════════════════════════════════════════════════════════════════════
  CylinderApp.svelte  –  Constrained optimisation: surface area of a cylinder
  Layout : two-column, no scroll, desktop/tablet (beamer).
  Left   : interactive SVG cylinder with r, h sliders.
  Right  : two Plotly 3D surface plots, A(r,h) and V(r,h),
           with a live orange marker at the current (r, h) point.
  Colour palette matches existing TikZ / Svelte components:
    CB  = #005a94  (dark blue)
    CO  = #e87846  (orange)
    CDG = #484949  (dark gray)
    CLB = #ccdee9  (light blue)
  ══════════════════════════════════════════════════════════════════════════════
-->

<svelte:head>
  <script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
</svelte:head>

<script>
  import { onMount, tick } from 'svelte';

  // ── Constants ──────────────────────────────────────────────────────────────
  const V0      = 16 * Math.PI;   // target volume [m³]

  // ── Colour tokens ──────────────────────────────────────────────────────────
  const CB  = '#005a94';
  const CO  = '#e87846';
  const CDG = '#484949';
  const CLB = '#ccdee9';

  // ── Slider state ───────────────────────────────────────────────────────────
  let r = 2.0;   // radius [m]
  let h = 4.0;   // height [m]

  // ── Derived values ─────────────────────────────────────────────────────────
  $: A_val = 2 * Math.PI * r * r + 2 * Math.PI * r * h;
  $: V_val = Math.PI * r * r * h;

  // ── SVG cylinder geometry ──────────────────────────────────────────────────
  // viewBox is fixed: 0 0 260 340
  // We map r ∈ [0.5, 6] → half-width ∈ [18, 108] px
  // We map h ∈ [0.5, 20] → body height ∈ [12, 240] px
  const VB_W  = 260;
  const VB_H  = 340;
  const CX    = VB_W / 2;          // 130 – horizontal centre

  const R_MIN = 0.5;  const R_MAX = 6.0;
  const H_MIN = 0.5;  const H_MAX = 20.0;

  const RX_MIN = 18;  const RX_MAX = 108;   // ellipse x-radius pixels
  const RY_FAC = 0.28;                       // ellipse y-radius = rx * factor
  const BH_MIN = 12;  const BH_MAX = 220;   // body height pixels

  $: rx   = RX_MIN + (r - R_MIN) / (R_MAX - R_MIN) * (RX_MAX - RX_MIN);
  $: ry   = rx * RY_FAC;
  $: bh   = BH_MIN + (h - H_MIN) / (H_MAX - H_MIN) * (BH_MAX - BH_MIN);

  // vertical centering: top ellipse centre
  $: topY = (VB_H - bh) / 2;
  $: botY = topY + bh;

  // dimension arrow positions (derived from rx, topY, botY)
  $: arrowX  = CX + rx + 18;        // x of vertical h-arrow
  $: arrowRY = topY - ry - 14;      // y of horizontal r-arrow

  // ── Phase diagram geometry (SVG viewBox 200×160) ────────────────────────
  // Maps r ∈ [R_MIN, R_MAX] → px_x, h ∈ [0, H_MAX] → px_y (inverted)
  const PD_W = 200; const PD_H = 160;
  const PD_PAD_L = 28; const PD_PAD_R = 10;
  const PD_PAD_T = 10; const PD_PAD_B = 24;
  const PD_IW = PD_W - PD_PAD_L - PD_PAD_R;  // 162
  const PD_IH = PD_H - PD_PAD_T - PD_PAD_B;  // 126

  const pdX = rv => PD_PAD_L + (rv - R_MIN) / (R_MAX - R_MIN) * PD_IW;
  const pdY = hv => PD_PAD_T + (1 - (hv - 0) / (H_MAX - 0)) * PD_IH;

  // Constraint curve h(r) = V0 / (pi * r^2), clamped to [0, H_MAX]
  const curveN  = 120;
  const curvePts = Array.from({length: curveN}, (_, i) => {
    const ri = R_MIN + i / (curveN - 1) * (R_MAX - R_MIN);
    const hi = V0 / (Math.PI * ri * ri);
    return [pdX(ri), pdY(Math.min(hi, H_MAX))];
  });
  // Only keep points where h ≤ H_MAX (visible region)
  const curveVisible = Array.from({length: curveN}, (_, i) => {
    const ri = R_MIN + i / (curveN - 1) * (R_MAX - R_MIN);
    return V0 / (Math.PI * ri * ri) <= H_MAX;
  });
  // Build polyline string (split at clipping boundary)
  function buildCurvePolyline() {
    const segs = [];
    let cur = [];
    for (let i = 0; i < curveN; i++) {
      if (curveVisible[i]) {
        cur.push(curvePts[i].map(v => v.toFixed(1)).join(','));
      } else {
        if (cur.length > 1) segs.push(cur.join(' '));
        cur = [];
      }
    }
    if (cur.length > 1) segs.push(cur.join(' '));
    return segs;
  }
  const curveSegs = buildCurvePolyline();

  // Current point in phase diagram
  $: pdPx = pdX(r);
  $: pdPy = pdY(h);

  // Soft colour: distance to constraint curve → interpolate red..green
  // d = |V - V0| / V0, mapped 0..0.15 → green..red
  $: vDist    = Math.abs(V_val - V0) / V0;           // 0 = on curve
  $: vOk      = vDist < 0.02;                         // within 2%
  $: vFrac    = Math.min(vDist / 0.15, 1.0);          // 0=green,1=red
  // Interpolate green(34,139,34) → orange(232,120,70) → red(180,40,30)
  function lerpColor(t) {
    if (t < 0.5) {
      const u = t * 2;
      const r = Math.round(34  + u * (232 - 34));
      const g = Math.round(139 + u * (120 - 139));
      const b = Math.round(34  + u * (70  - 34));
      return `rgb(${r},${g},${b})`;
    } else {
      const u = (t - 0.5) * 2;
      const r = Math.round(232 + u * (180 - 232));
      const g = Math.round(120 + u * (40  - 120));
      const b = Math.round(70  + u * (30  - 70));
      return `rgb(${r},${g},${b})`;
    }
  }
  $: dotColor    = lerpColor(vFrac);
  $: tileBg      = vOk ? '#edf7ee' : `rgba(${Math.round(180*vFrac+237*(1-vFrac))},${Math.round(40*vFrac+247*(1-vFrac))},${Math.round(30*vFrac+238*(1-vFrac))},0.18)`;

  // ── Plotly surface data ────────────────────────────────────────────────────
  // Grid: 40×40 over r ∈ [0.5,6], h ∈ [0.5,20]
  const N   = 40;
  const rs  = Array.from({length: N}, (_, i) => R_MIN + i / (N-1) * (R_MAX - R_MIN));
  const hs  = Array.from({length: N}, (_, i) => H_MIN + i / (N-1) * (H_MAX - H_MIN));

  // A(r,h) grid  [h-index][r-index]
  const zA = hs.map(hi => rs.map(ri => 2*Math.PI*ri*ri + 2*Math.PI*ri*hi));
  // V(r,h) grid
  const zV = hs.map(hi => rs.map(ri => Math.PI*ri*ri*hi));

  // Colorscale: inverted Viridis (low values = yellow, high = dark blue)

  // Shared layout template
  function makeSurfaceLayout(zTitle) {
    return {
      margin: {l: 0, r: 0, t: 32, b: 0},
      paper_bgcolor: 'rgba(0,0,0,0)',
      scene: {
        xaxis: {title: {text: 'r (m)', font: {color: CDG, size: 11}},
                tickfont: {color: CDG, size: 9}, gridcolor: '#ddd',
                range: [R_MIN, R_MAX]},
        yaxis: {title: {text: 'h (m)', font: {color: CDG, size: 11}},
                tickfont: {color: CDG, size: 9}, gridcolor: '#ddd',
                range: [H_MIN, H_MAX]},
        zaxis: {title: {text: zTitle, font: {color: CDG, size: 11}},
                tickfont: {color: CDG, size: 9}, gridcolor: '#ddd'},
        bgcolor: 'rgba(0,0,0,0)',
        camera: {eye: {x: 1.6, y: -1.6, z: 0.9}},
      },
      font: {family: 'Helvetica Neue, Arial, sans-serif'},
      showlegend: false,
    };
  }

  // ── Plotly DOM refs ────────────────────────────────────────────────────────
  let plotA, plotV;
  let plotsReady = false;
  let topView    = false;
  let switching  = false;

  // ── Draggable divider ──────────────────────────────────────────────────────
  let splitPct   = 50;       // % height of top plot
  let dragging   = false;
  let rightPanel;            // bound to right-panel section

  function onDividerDown(e) {
    e.preventDefault();
    dragging = true;
  }

  function onMouseMove(e) {
    if (!dragging || !rightPanel) return;
    const rect    = rightPanel.getBoundingClientRect();
    // account for right-header height (≈28px)
    const headerH = 28;
    const usable  = rect.height - headerH - 8; // 8 = divider height
    const offsetY = (e.clientY - rect.top - headerH);
    const pct     = (offsetY / usable) * 100;
    splitPct = Math.min(90, Math.max(10, pct));
  }

  function onMouseUp() { dragging = false; }

  // ── Static surface traces ─────────────────────────────────────────────────
  const surf3A = {
    type: 'surface', x: rs, y: hs, z: zA,
    colorscale: 'Viridis', reversescale: true,
    showscale: false, opacity: 0.88,
    cmin: 50, cmax: 300,
    hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>A=%{z:.1f} m²<extra></extra>',
  };
  const surf3V = {
    type: 'surface', x: rs, y: hs, z: zV,
    colorscale: 'Viridis', reversescale: true,
    showscale: false, opacity: 0.88,
    contours: {
      z: {show: true, start: 4*Math.PI, end: 28*Math.PI, size: 4*Math.PI,
          color: '#9ab8cc', width: 1.5, usecolormap: false,
          highlightcolor: '#E60000', highlightwidth: 3},
    },
    hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>V=%{z:.1f} m³<extra></extra>',
  };

  function marker3(ri, hi, zi) {
    return {
      type: 'scatter3d', x: [ri], y: [hi], z: [zi], mode: 'markers',
      marker: {color: CO, size: 7, symbol: 'circle',
               line: {color: '#fff', width: 1.5}},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>value=%{z:.2f}<extra></extra>',
    };
  }

  // ── 2D contour traces ──────────────────────────────────────────────────────
  function contour2A() {
    return {
      type: 'contour', x: rs, y: hs, z: zA,
      colorscale: 'Viridis', reversescale: true,
      showscale: false, reversescale: true,
      contours: {coloring: 'fill', showlines: true, start: 75, end: 320, size: 25},
      line: {color: CB, width: 1},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>A=%{z:.1f} m²<extra></extra>',
    };
  }
  function contour2V() {
    return {
      type: 'contour', x: rs, y: hs, z: zV,
      colorscale: 'Viridis', reversescale: true,
      showscale: false,
      contours: {coloring: 'fill', showlines: true,
                 start: 4*Math.PI, end: 28*Math.PI, size: 4*Math.PI},
      line: {color: CB, width: 1},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>V=%{z:.1f} m³<extra></extra>',
    };
  }
  function contour2VHighlight() {
    return {
      type: 'contour', x: rs, y: hs, z: zV,
      showscale: false,
      contours: {coloring: 'none', showlines: true,
                 start: V0-0.01, end: V0+0.01, size: 0.02},
      line: {color: '#E60000', width: 3},
      hoverinfo: 'skip',
    };
  }
  function marker2(ri, hi) {
    return {
      type: 'scatter', x: [ri], y: [hi], mode: 'markers',
      marker: {color: CO, size: 10, symbol: 'circle',
               line: {color: '#fff', width: 2}},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<extra></extra>',
    };
  }

  const cfg = {responsive: true, displayModeBar: false};

  function layout2D(xTitle, yTitle) {
    return {
      margin: {l: 48, r: 16, t: 32, b: 44},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor:  'rgba(0,0,0,0)',
      xaxis: {title: {text: xTitle, font: {color: CDG, size: 11}},
              tickfont: {color: CDG, size: 9}, gridcolor: '#ddd',
              range: [R_MIN, R_MAX]},
      yaxis: {title: {text: yTitle, font: {color: CDG, size: 11}},
              tickfont: {color: CDG, size: 9}, gridcolor: '#ddd',
              range: [H_MIN, H_MAX]},
      font: {family: 'Helvetica Neue, Arial, sans-serif'},
      showlegend: false,
    };
  }

  async function draw3D() {
    await Plotly.newPlot(plotA, [surf3A, marker3(r, h, A_val)],
      makeSurfaceLayout('A (m²)'), cfg);
    await Plotly.newPlot(plotV, [surf3V, marker3(r, h, V_val)],
      makeSurfaceLayout('V (m³)'), cfg);
  }

  async function draw2D() {
    await Plotly.newPlot(plotA, [contour2A(), marker2(r, h)],
      layout2D('r (m)', 'h (m)'), cfg);
    await Plotly.newPlot(plotV, [contour2V(), contour2VHighlight(), marker2(r, h)],
      layout2D('r (m)', 'h (m)'), cfg);
  }

  onMount(async () => {
    await tick();
    if (typeof Plotly === 'undefined') return;
    await draw3D();
    plotsReady = true;
  });

  async function toggleView() {
    if (!plotsReady || switching) return;
    switching = true;
    topView = !topView;
    if (topView) { await draw2D(); } else { await draw3D(); }
    switching = false;
  }

  // ── Reactive: update marker ────────────────────────────────────────────────
  $: if (plotsReady && !switching) {
    if (topView) {
      Plotly.restyle(plotA, {x: [[r]], y: [[h]]}, [1]);
      Plotly.restyle(plotV, {x: [[r]], y: [[h]]}, [2]);
    } else {
      Plotly.restyle(plotA, {x: [[r]], y: [[h]], z: [[A_val]]}, [1]);
      Plotly.restyle(plotV, {x: [[r]], y: [[h]], z: [[V_val]]}, [1]);
    }
  }

  // ── Reactive: resize Plotly when divider moves ─────────────────────────────
  $: if (plotsReady && splitPct) {
    // Use requestAnimationFrame so the DOM has updated its layout first
    requestAnimationFrame(() => {
      Plotly.relayout(plotA, {autosize: true});
      Plotly.relayout(plotV, {autosize: true});
    });
  }
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="app" role="application"
     on:mousemove={onMouseMove}
     on:mouseup={onMouseUp}
     on:mouseleave={onMouseUp}>

  <!-- Header ─────────────────────────────────────────────────────────────── -->
  <header>
    <h1>Cylinder optimisation: surface area under volume constraint</h1>
    <p>
      Adjust radius <em>r</em> and height <em>h</em> freely. Observe how
      surface area <em>A</em> and volume <em>V</em> change independently.
      The target volume is <em>V</em><sub>0</sub> = 16&pi; m³.
    </p>
  </header>

  <!-- Main two-column layout ─────────────────────────────────────────────── -->
  <main>

    <!-- LEFT: Cylinder + controls + info-bar ──────────────────────────────── -->
    <section class="left-panel">

      <!-- SVG cylinder -->
      <div class="svg-wrap">
        <svg viewBox="0 0 {VB_W} {VB_H}"
             preserveAspectRatio="xMidYMid meet"
             role="img"
             aria-label="Cylinder with adjustable radius r and height h">

          <!-- Shadow / base ellipse bottom -->
          <ellipse cx={CX} cy={botY} rx={rx} ry={ry}
                   fill={CLB} stroke={CB} stroke-width="1.6"/>

          <!-- Cylinder body (rectangle between top and bottom ellipses) -->
          <rect x={CX - rx} y={topY} width={rx * 2} height={bh}
                fill={CLB} stroke="none"/>
          <!-- Side strokes -->
          <line x1={CX - rx} y1={topY} x2={CX - rx} y2={botY}
                stroke={CB} stroke-width="1.6"/>
          <line x1={CX + rx} y1={topY} x2={CX + rx} y2={botY}
                stroke={CB} stroke-width="1.6"/>

          <!-- Top ellipse (solid fill to hide back) -->
          <ellipse cx={CX} cy={topY} rx={rx} ry={ry}
                   fill={CLB} stroke={CB} stroke-width="1.6"/>

          <!-- Dimension arrow: height h (right side) -->
          <defs>
            <marker id="arr-h" markerWidth="6" markerHeight="6"
                    refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0.5 L5 3 L0 5.5 Z" fill={CDG}/>
            </marker>
            <marker id="arr-h2" markerWidth="6" markerHeight="6"
                    refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M5 0.5 L0 3 L5 5.5 Z" fill={CDG}/>
            </marker>
            <marker id="arr-r" markerWidth="6" markerHeight="6"
                    refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0.5 L5 3 L0 5.5 Z" fill={CDG}/>
            </marker>
          </defs>

          <!-- h arrow (right side) -->
          <line x1={arrowX} y1={topY} x2={arrowX} y2={botY}
                stroke={CDG} stroke-width="1.3"
                marker-start="url(#arr-h2)" marker-end="url(#arr-h)"/>
          <text x={arrowX + 8} y={(topY + botY) / 2 + 4}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="13" font-style="italic" fill={CDG}
                dominant-baseline="middle">h</text>

          <!-- r arrow (top ellipse centre to edge) -->
          <line x1={CX} y1={arrowRY} x2={CX + rx} y2={arrowRY}
                stroke={CDG} stroke-width="1.3"
                marker-end="url(#arr-r)"/>
          <line x1={CX} y1={arrowRY - 5} x2={CX} y2={arrowRY + 5}
                stroke={CDG} stroke-width="1.3"/>
          <text x={CX + rx / 2} y={arrowRY - 6}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="13" font-style="italic" fill={CDG}
                text-anchor="middle">r</text>

        </svg>
      </div>

      <!-- Sliders ──────────────────────────────────────────────────────────── -->
      <div class="controls">
        <div class="slider-row">
          <label for="sl-r">radius <em>r</em></label>
          <input id="sl-r" type="range"
                 min={R_MIN} max={R_MAX} step="0.05"
                 bind:value={r}/>
          <span class="sl-val">{r.toFixed(2)} m</span>
        </div>
        <div class="slider-row">
          <label for="sl-h">height <em>h</em></label>
          <input id="sl-h" type="range"
                 min={H_MIN} max={H_MAX} step="0.1"
                 bind:value={h}/>
          <span class="sl-val">{h.toFixed(2)} m</span>
        </div>
      </div>

      <!-- Phase diagram ───────────────────────────────────────────────────── -->
      <div class="phase-wrap">
        <svg viewBox="0 0 {PD_W} {PD_H}"
             preserveAspectRatio="xMidYMid meet"
             role="img"
             aria-label="Phase diagram: current (r, h) point relative to constraint curve V = V0">

          <!-- Axes -->
          <line x1={PD_PAD_L} y1={PD_PAD_T}
                x2={PD_PAD_L} y2={PD_PAD_T + PD_IH}
                stroke={CDG} stroke-width="1.2"/>
          <line x1={PD_PAD_L} y1={PD_PAD_T + PD_IH}
                x2={PD_PAD_L + PD_IW} y2={PD_PAD_T + PD_IH}
                stroke={CDG} stroke-width="1.2"/>

          <!-- r axis ticks: 1, 2, 3, 4, 5, 6 -->
          {#each [1,2,3,4,5,6] as tv}
            <line x1={pdX(tv)} y1={PD_PAD_T + PD_IH}
                  x2={pdX(tv)} y2={PD_PAD_T + PD_IH + 3}
                  stroke={CDG} stroke-width="1"/>
            <text x={pdX(tv)} y={PD_PAD_T + PD_IH + 11}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="7" fill={CDG} text-anchor="middle">{tv}</text>
          {/each}

          <!-- h axis ticks: 0, 5, 10, 15, 20 -->
          {#each [0,5,10,15,20] as tv}
            <line x1={PD_PAD_L - 3} y1={pdY(tv)}
                  x2={PD_PAD_L}     y2={pdY(tv)}
                  stroke={CDG} stroke-width="1"/>
            <text x={PD_PAD_L - 5} y={pdY(tv)}
                  font-family="Helvetica Neue,Arial,sans-serif"
                  font-size="7" fill={CDG}
                  text-anchor="end" dominant-baseline="middle">{tv}</text>
          {/each}

          <!-- Axis labels -->
          <text x={PD_PAD_L + PD_IW / 2} y={PD_H - 2}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="8" font-style="italic" fill={CDG}
                text-anchor="middle">r (m)</text>
          <text x="7" y={PD_PAD_T + PD_IH / 2}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="8" font-style="italic" fill={CDG}
                text-anchor="middle"
                transform="rotate(-90 7 {PD_PAD_T + PD_IH / 2})">h (m)</text>

          <!-- Constraint curve V = V0 (clipped to visible region) -->
          {#each curveSegs as seg}
            <polyline points={seg}
                      fill="none" stroke={CB}
                      stroke-width="1.6" stroke-linejoin="round"
                      opacity="0.7"/>
          {/each}

          <!-- Curve label -->
          <text x={pdX(3.6)} y={pdY(V0 / (Math.PI * 3.6 * 3.6)) - 5}
                font-family="Helvetica Neue,Arial,sans-serif"
                font-size="7.5" fill={CB} text-anchor="middle"
                font-style="italic">V = V₀</text>

          <!-- Current point -->
          <circle cx={pdPx} cy={pdPy} r="5"
                  fill={dotColor}
                  stroke="#fff" stroke-width="1.5"
                  opacity="0.92"/>

        </svg>
      </div>

      <!-- Info bar ─────────────────────────────────────────────────────────── -->
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
        <div class="info-tile volume-tile" style="background:{tileBg}">
          <span class="info-lbl">volume V</span>
          <span class="info-val">{V_val.toFixed(1)} m³</span>
          <span class="badge" style="background:{vOk ? '#c6edca' : 'transparent'}; color:{vOk ? '#1a6b26' : dotColor}; border: 1px solid {dotColor}">
            {vOk ? 'V = V₀ ✓' : 'V ≠ V₀'}
          </span>
        </div>
      </div>

    </section>

    <!-- RIGHT: Surface plots ─────────────────────────────────────────────── -->
    <section class="right-panel" bind:this={rightPanel}>

      <div class="right-header">
        <button class="view-btn" on:click={toggleView}>
          {topView ? '↗ 3D view' : '⊡ top view'}
        </button>
      </div>

      <div class="plot-wrap" style="flex: 0 0 {splitPct}%; min-height: 0;">
        <div class="plot-title">
          surface area &nbsp;<em>A</em>(r, h) = 2&pi;r² + 2&pi;rh &nbsp;(m²)
        </div>
        <div class="plotly-container" bind:this={plotA}></div>
      </div>

      <div class="divider" role="separator" aria-label="Drag to resize plots"
           on:mousedown={onDividerDown}
           class:active={dragging}>
        <span class="divider-icon">⠿</span>
      </div>

      <div class="plot-wrap" style="flex: 1; min-height: 0;">
        <div class="plot-title">
          volume &nbsp;<em>V</em>(r, h) = &pi;r²h &nbsp;(m³)
        </div>
        <div class="plotly-container" bind:this={plotV}></div>
      </div>

    </section>

  </main>

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

  /* ── App shell ──────────────────────────────────────────────────────────── */
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

  /* ── Header ─────────────────────────────────────────────────────────────── */
  header {
    padding: 12px 24px 10px;
    border-bottom: 1px solid var(--border);
    background: #f3f4f6;
    flex-shrink: 0;
  }
  header h1 {
    font-size: 1.0rem;
    font-weight: normal;
    letter-spacing: .02em;
    color: var(--text);
  }
  header p {
    margin-top: 3px;
    font-size: .78rem;
    font-family: var(--font-ui);
    color: var(--muted);
    line-height: 1.45;
  }

  /* ── Main two-column ────────────────────────────────────────────────────── */
  main {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left panel ─────────────────────────────────────────────────────────── */
  .left-panel {
    width: 38%;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .svg-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: var(--surface);
  }
  .svg-wrap svg {
    width: 100%;
    height: 100%;
    max-height: 340px;
  }

  /* ── Controls ───────────────────────────────────────────────────────────── */
  .controls {
    padding: 10px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }
  .slider-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-ui);
    font-size: .82rem;
  }
  .slider-row label {
    min-width: 72px;
    color: var(--muted);
  }
  .slider-row input[type=range] {
    flex: 1;
    accent-color: #005a94;
    cursor: pointer;
    height: 5px;
  }
  .sl-val {
    min-width: 56px;
    font-weight: 700;
    font-size: .88rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #333;
    font-family: var(--font-ui);
  }

  /* ── Info bar ────────────────────────────────────────────────────────────── */
  .info-bar {
    display: flex;
    border-top: 1px solid var(--border);
    background: #f3f4f6;
    flex-shrink: 0;
  }
  .info-tile {
    flex: 1;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }
  .info-lbl {
    font-family: var(--font-ui);
    font-size: .64rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .info-val {
    font-family: var(--font-ui);
    font-size: .95rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* Volume tile: badge always present, no layout shift */
  .volume-tile { transition: background 0.3s ease; }

  .badge {
    font-size: .62rem;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: var(--font-ui);
    white-space: nowrap;
    transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
    align-self: flex-start;
  }

  /* ── Phase diagram ──────────────────────────────────────────────────────── */
  .phase-wrap {
    border-top: 1px solid var(--border);
    padding: 6px 16px 4px;
    background: var(--surface);
    flex-shrink: 0;
    display: flex;
    justify-content: center;
  }
  .phase-wrap svg {
    width: 100%;
    max-width: 220px;
    height: auto;
    display: block;
  }

  /* ── Right panel ─────────────────────────────────────────────────────────── */
  .right-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    background: var(--surface);
  }

  .plot-wrap {
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border);
    padding: 6px 12px 4px;
    overflow: hidden;
  }
  .plot-wrap:last-child { border-bottom: none; }

  /* ── Draggable divider ──────────────────────────────────────────────────── */
  .divider {
    flex-shrink: 0;
    height: 8px;
    background: var(--border);
    cursor: row-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    transition: background .15s;
  }
  .divider:hover, .divider.active { background: #ccdee9; }
  .divider-icon {
    font-size: 10px;
    color: #999;
    line-height: 1;
    pointer-events: none;
  }
  .divider:hover .divider-icon, .divider.active .divider-icon {
    color: #005a94;
  }

  .plot-title {
    font-family: var(--font-ui);
    font-size: .75rem;
    color: var(--muted);
    flex-shrink: 0;
    padding-bottom: 2px;
  }

  .plotly-container {
    flex: 1;
    min-height: 0;
  }

  .right-header {
    display: flex;
    justify-content: flex-end;
    padding: 6px 12px 0;
    flex-shrink: 0;
  }

  .view-btn {
    padding: 4px 14px;
    font-family: var(--font-ui);
    font-size: .78rem;
    color: #005a94;
    background: transparent;
    border: 1px solid #005a94;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: background .15s, color .15s;
  }
  .view-btn:hover  { background: #005a94; color: #fff; }
  .view-btn:active { transform: scale(.97); }
</style>
