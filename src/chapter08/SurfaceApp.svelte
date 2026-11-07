<!--
  ══════════════════════════════════════════════════════════════════════════════
  SurfaceApp.svelte  –  Constrained optimisation: surface plots with constraint
  Changes v3:
    - Area plot: cmin/cmax on trace (no z-axis clipping); better camera.
    - Volume plot: isolines V = 4π…28π; V0 = 16π highlighted in orange.
    - Top-view toggle: replaces both 3D surfaces with real 2D contour plots
      (Plotly type:'contour') so the r-h plane is shown correctly.
      Switching back restores the 3D surfaces.
  ══════════════════════════════════════════════════════════════════════════════
-->

<svelte:head>
  <script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
</svelte:head>

<script>
  import { onMount, tick } from 'svelte';

  // ── Constants ──────────────────────────────────────────────────────────────
  const V0 = 16 * Math.PI;

  // ── Colour tokens ──────────────────────────────────────────────────────────
  const CB  = '#005a94';
  const CO  = '#e87846';
  const CR  = '#E60000';  // constraint red
  const CDG = '#484949';

  // ── Ranges ─────────────────────────────────────────────────────────────────
  const R_MIN_FREE = 0.5;
  const R_MAX      = 6.0;
  const H_MAX      = 20.0;
  const R_MIN      = Math.sqrt(V0 / (Math.PI * H_MAX));  // ≈ 0.894

  // ── State ──────────────────────────────────────────────────────────────────
  let r       = 2.0;
  let topView = false;

  // ── Derived ────────────────────────────────────────────────────────────────
  $: h     = V0 / (Math.PI * r * r);
  $: A_val = 2 * Math.PI * r * r + 2 * Math.PI * r * h;
  $: V_val = Math.PI * r * r * h;

  // ── Surface grid (shared by 3D surface and 2D contour) ────────────────────
  const N  = 60;
  const rs = Array.from({length: N}, (_, i) =>
    R_MIN_FREE + i / (N - 1) * (R_MAX - R_MIN_FREE));
  const hs = Array.from({length: N}, (_, i) =>
    0.5 + i / (N - 1) * (H_MAX - 0.5));

  const zA = hs.map(hi => rs.map(ri =>
    2 * Math.PI * ri * ri + 2 * Math.PI * ri * hi));
  const zV = hs.map(hi => rs.map(ri =>
    Math.PI * ri * ri * hi));

  // ── Constraint curve ───────────────────────────────────────────────────────
  const CN  = 100;
  const crs = Array.from({length: CN}, (_, i) =>
    R_MIN + i / (CN - 1) * (R_MAX - R_MIN));
  const chs = crs.map(ri => V0 / (Math.PI * ri * ri));

  const cAsA = crs.map((ri, i) =>
    2 * Math.PI * ri * ri + 2 * Math.PI * ri * chs[i]);
  const cAsV = chs.map(() => V0);

  const cA_min = Math.min(...cAsA);
  const cA_max = Math.max(...cAsA);

  function curveColor(aVal) {
    const t = Math.min((aVal - cA_min) / (cA_max - cA_min), 1);
    if (t < 0.5) {
      const u = t * 2;
      return `rgb(${Math.round(34+u*(220-34))},${Math.round(139+u*(180-139))},34)`;
    } else {
      const u = (t - 0.5) * 2;
      return `rgb(${Math.round(220+u*(180-220))},${Math.round(180+u*(30-180))},${Math.round(34+u*(30-34))})`;
    }
  }
  const curveColors = cAsA.map(curveColor);


  // ── 3D layouts ─────────────────────────────────────────────────────────────
  // Camera angle chosen so the curve's minimum valley faces the viewer
  const CAM_3D = {eye: {x: 1.8, y: -1.4, z: 1.1}};

  function layout3D(zTitle) {
    return {
      margin: {l: 0, r: 0, t: 36, b: 0},
      paper_bgcolor: 'rgba(0,0,0,0)',
      scene: {
        xaxis: {title: {text: 'r (m)', font: {color: CDG, size: 11}},
                tickfont: {color: CDG, size: 9}, gridcolor: '#ddd',
                range: [R_MIN_FREE, R_MAX]},
        yaxis: {title: {text: 'h (m)', font: {color: CDG, size: 11}},
                tickfont: {color: CDG, size: 9}, gridcolor: '#ddd',
                range: [0.5, H_MAX]},
        zaxis: {title: {text: zTitle, font: {color: CDG, size: 11}},
                tickfont: {color: CDG, size: 9}, gridcolor: '#ddd'},
        bgcolor: 'rgba(0,0,0,0)',
        camera: CAM_3D,
      },
      font: {family: 'Helvetica Neue, Arial, sans-serif'},
      showlegend: false,
    };
  }

  // ── 2D contour layouts ─────────────────────────────────────────────────────
  function layout2D(xTitle, yTitle) {
    return {
      margin: {l: 48, r: 16, t: 36, b: 44},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor:  'rgba(0,0,0,0)',
      xaxis: {title: {text: xTitle, font: {color: CDG, size: 11}},
              tickfont: {color: CDG, size: 9},
              gridcolor: '#ddd', range: [R_MIN_FREE, R_MAX]},
      yaxis: {title: {text: yTitle, font: {color: CDG, size: 11}},
              tickfont: {color: CDG, size: 9},
              gridcolor: '#ddd', range: [0.5, H_MAX]},
      font: {family: 'Helvetica Neue, Arial, sans-serif'},
      showlegend: false,
    };
  }

  const cfg = {responsive: true, displayModeBar: false};

  // ── 3D trace builders ──────────────────────────────────────────────────────
  const surf3A = {
    type: 'surface', x: rs, y: hs, z: zA,
    colorscale: 'Viridis', reversescale: true, showscale: false, opacity: 0.78,
    cmin: 50, cmax: 300,
    hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>A=%{z:.1f} m²<extra></extra>',
  };

  const surf3V = {
    type: 'surface', x: rs, y: hs, z: zV,
    colorscale: 'Viridis', reversescale: true, showscale: false, opacity: 0.78,
    contours: {
      z: {show: true, start: 4*Math.PI, end: 28*Math.PI, size: 4*Math.PI,
          color: '#9ab8cc', width: 1.5, usecolormap: false,
          highlightcolor: CO, highlightwidth: 3},
    },
    hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>V=%{z:.1f} m³<extra></extra>',
  };

  function curve3Coded() {
    return {type: 'scatter3d', x: crs, y: chs, z: cAsA, mode: 'lines',
            line: {color: '#ffffff', width: 6}, opacity: 0.90, hoverinfo: 'skip'};
  }
  function curve3Orange(zvals) {
    return {type: 'scatter3d', x: crs, y: chs, z: zvals, mode: 'lines',
            line: {color: CR, width: 7}, opacity: 0.85, hoverinfo: 'skip'};
  }
  function point3(ri, hi, zi) {
    return {type: 'scatter3d', x: [ri], y: [hi], z: [zi], mode: 'markers',
            marker: {color: '#fff', size: 8, symbol: 'circle',
                     line: {color: CO, width: 3}},
            hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>value=%{z:.2f}<extra></extra>'};
  }

  // ── 2D trace builders ──────────────────────────────────────────────────────
  // A contour plot: levels at 75 (≈ min), 100, 150, 200, 250, 300
  const A_LEVELS = [75.4, 100, 150, 200, 250, 300];

  function contour2A() {
    return {
      type: 'contour', x: rs, y: hs, z: zA,
      colorscale: 'Viridis', reversescale: true, showscale: false,
      contours: {
        coloring: 'fill',
        showlines: true,
        start: 75, end: 320, size: 25,
      },
      line: {color: CB, width: 1},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>A=%{z:.1f} m²<extra></extra>',
    };
  }

  // Minimum marker line A ≈ 75.4 m² – drawn as a separate contour trace
  function contour2AMinLine() {
    return {
      type: 'contour', x: rs, y: hs, z: zA,
      showscale: false,
      contours: {
        coloring: 'none',
        showlines: true,
        start: 75.4, end: 75.5, size: 0.1,
      },
      line: {color: '#1a7a1a', width: 2.5, dash: 'dot'},
      hoverinfo: 'skip',
    };
  }

  // V contour plot: levels every 4π, V0 = 16π highlighted
  function contour2V() {
    return {
      type: 'contour', x: rs, y: hs, z: zV,
      colorscale: 'Viridis', reversescale: true, showscale: false,
      contours: {
        coloring: 'fill',
        showlines: true,
        start: 4*Math.PI, end: 28*Math.PI, size: 4*Math.PI,
      },
      line: {color: CB, width: 1},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<br>V=%{z:.1f} m³<extra></extra>',
    };
  }

  // V0 = 16π isoline highlighted in orange
  function contour2VHighlight() {
    return {
      type: 'contour', x: rs, y: hs, z: zV,
      showscale: false,
      contours: {
        coloring: 'none',
        showlines: true,
        start: V0 - 0.01, end: V0 + 0.01, size: 0.02,
      },
      line: {color: CR, width: 3},
      hoverinfo: 'skip',
    };
  }

  // Constraint curve as 2D scatter – white for A plot, red for V plot
  function curve2White() {
    return {
      type: 'scatter', x: crs, y: chs, mode: 'lines',
      line: {color: '#ffffff', width: 3},
      hoverinfo: 'skip',
    };
  }
  function curve2Red() {
    return {
      type: 'scatter', x: crs, y: chs, mode: 'lines',
      line: {color: CR, width: 3},
      hoverinfo: 'skip',
    };
  }

  // Current point in 2D
  function point2(ri, hi) {
    return {
      type: 'scatter', x: [ri], y: [hi], mode: 'markers',
      marker: {color: '#fff', size: 10, symbol: 'circle',
               line: {color: CO, width: 3}},
      hovertemplate: 'r=%{x:.2f} m<br>h=%{y:.2f} m<extra></extra>',
    };
  }

  // ── DOM refs ───────────────────────────────────────────────────────────────
  let plotA, plotV;
  let ready = false;

  onMount(async () => {
    await tick();
    if (typeof Plotly === 'undefined') return;
    await draw3D();
    ready = true;
  });

  async function draw3D() {
    await Plotly.newPlot(plotA,
      [surf3A, curve3Coded(), point3(r, h, A_val)],
      layout3D('A (m²)'), cfg);
    await Plotly.newPlot(plotV,
      [surf3V, curve3Orange(cAsV), point3(r, h, V_val)],
      layout3D('V (m³)'), cfg);
  }

  async function draw2D() {
    await Plotly.newPlot(plotA,
      [contour2A(), contour2AMinLine(), curve2White(), point2(r, h)],
      layout2D('r (m)', 'h (m)'), cfg);
    await Plotly.newPlot(plotV,
      [contour2V(), contour2VHighlight(), curve2Red(), point2(r, h)],
      layout2D('r (m)', 'h (m)'), cfg);
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────
  let switching = false;

  async function toggleView() {
    if (!ready || switching) return;
    switching = true;
    topView = !topView;
    if (topView) {
      await draw2D();
    } else {
      await draw3D();
    }
    switching = false;
  }

  // ── Reactive: update point only – blocked while switching ──────────────────
  $: if (ready && !switching) {
    if (topView) {
      // point is trace index 3 in 2D mode
      Plotly.restyle(plotA, {x: [[r]], y: [[h]]}, [3]);
      Plotly.restyle(plotV, {x: [[r]], y: [[h]]}, [3]);
    } else {
      // point is trace index 2 in 3D mode
      Plotly.restyle(plotA, {x: [[r]], y: [[h]], z: [[A_val]]}, [2]);
      Plotly.restyle(plotV, {x: [[r]], y: [[h]], z: [[V_val]]}, [2]);
    }
  }
</script>


<!-- ══════════════════════════════════════════════════════════════════════════
     TEMPLATE
     ══════════════════════════════════════════════════════════════════════════ -->

<div class="app">

  <header>
    <h1>Cylinder optimisation: constraint curve on the surface plots</h1>
    <p>
      The orange curve shows all (r,&thinsp;h) pairs satisfying
      V&nbsp;=&nbsp;V<sub>0</sub>&nbsp;=&nbsp;16&pi;&nbsp;m³,
      i.e. h&nbsp;=&nbsp;16/r².
      On the area plot the white curve traces the constraint in 3D;
      the surface colour reveals where A is small (yellow) or large (dark blue).
      Use <em>top view</em> to see the r-h plane directly.
    </p>
  </header>

  <main>
    <div class="plot-wrap">
      <div class="plot-title">
        surface area &nbsp;<em>A</em>(r,&thinsp;h) = 2&pi;r² + 2&pi;rh &nbsp;(m²)
      </div>
      <div class="plotly-container" bind:this={plotA}></div>
    </div>

    <div class="plot-wrap">
      <div class="plot-title">
        volume &nbsp;<em>V</em>(r,&thinsp;h) = &pi;r²h &nbsp;(m³)
      </div>
      <div class="plotly-container" bind:this={plotV}></div>
    </div>
  </main>

  <div class="controls">
    <div class="slider-row">
      <label for="sl-r">radius <em>r</em></label>
      <input id="sl-r" type="range"
             min={R_MIN} max={R_MAX} step="0.02"
             bind:value={r}/>
      <span class="sl-val">{r.toFixed(2)} m</span>
    </div>
    <div class="constraint-note">
      h = 16/r² = {h.toFixed(2)} m (constrained)
    </div>
    <button class="view-btn" on:click={toggleView}>
      {topView ? '↗ 3D view' : '⊡ top view'}
    </button>
  </div>

  <div class="info-bar">
    <div class="info-tile">
      <span class="info-lbl">radius r</span>
      <span class="info-val">{r.toFixed(2)} m</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">height h = 16/r²</span>
      <span class="info-val">{h.toFixed(2)} m</span>
    </div>
    <div class="info-tile">
      <span class="info-lbl">surface area A</span>
      <span class="info-val">{A_val.toFixed(1)} m²</span>
    </div>
    <div class="info-tile highlight">
      <span class="info-lbl">volume V</span>
      <span class="info-val">{V_val.toFixed(1)} m³</span>
      <span class="badge">V = V₀ ✓</span>
    </div>
  </div>

</div>


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

  header {
    padding: 12px 24px 10px;
    border-bottom: 1px solid var(--border);
    background: #f3f4f6;
    flex-shrink: 0;
  }
  header h1 {
    font-size: 1.0rem; font-weight: normal; letter-spacing: .02em;
  }
  header p {
    margin-top: 3px; font-size: .78rem;
    font-family: var(--font-ui); color: var(--muted); line-height: 1.45;
  }

  main {
    display: flex; flex: 1; min-height: 0; overflow: hidden;
  }

  .plot-wrap {
    flex: 1; min-width: 0; display: flex; flex-direction: column;
    border-right: 1px solid var(--border); padding: 6px 12px 4px;
  }
  .plot-wrap:last-child { border-right: none; }

  .plot-title {
    font-family: var(--font-ui); font-size: .75rem;
    color: var(--muted); flex-shrink: 0; padding-bottom: 2px;
  }

  .plotly-container { flex: 1; min-height: 0; }

  .controls {
    padding: 10px 20px 8px; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 16px; flex-shrink: 0;
  }

  .slider-row {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--font-ui); font-size: .82rem; flex: 1;
  }
  .slider-row label { min-width: 72px; color: var(--muted); }
  .slider-row input[type=range] {
    flex: 1; accent-color: #005a94; cursor: pointer; height: 5px;
  }
  .sl-val {
    min-width: 56px; font-weight: 700; font-size: .88rem;
    text-align: right; font-variant-numeric: tabular-nums;
    color: #333; font-family: var(--font-ui);
  }

  .constraint-note {
    font-family: var(--font-ui); font-size: .78rem;
    color: #E60000; font-style: italic;
    white-space: nowrap; font-variant-numeric: tabular-nums;
  }

  .view-btn {
    padding: 6px 16px; font-family: var(--font-ui); font-size: .82rem;
    color: #005a94; background: transparent;
    border: 1px solid #005a94; border-radius: 6px;
    cursor: pointer; white-space: nowrap;
    transition: background .15s, color .15s; flex-shrink: 0;
  }
  .view-btn:hover  { background: #005a94; color: #fff; }
  .view-btn:active { transform: scale(.97); }

  .info-bar {
    display: flex; border-top: 1px solid var(--border);
    background: #f3f4f6; flex-shrink: 0;
  }
  .info-tile {
    flex: 1; padding: 8px 10px;
    display: flex; flex-direction: column; gap: 1px;
    border-right: 1px solid var(--border);
  }
  .info-tile:last-child { border-right: none; }
  .info-tile.highlight  { background: #edf7ee; }

  .info-lbl {
    font-family: var(--font-ui); font-size: .64rem;
    color: var(--muted); white-space: nowrap;
  }
  .info-val {
    font-family: var(--font-ui); font-size: .95rem;
    font-weight: 700; font-variant-numeric: tabular-nums;
  }
  .badge {
    font-size: .62rem; font-weight: 600; padding: 1px 5px;
    border-radius: 4px; font-family: var(--font-ui); white-space: nowrap;
    background: #c6edca; color: #1a6b26; align-self: flex-start;
  }
</style>
