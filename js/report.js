/*
 * PDF design report. Loads jsPDF on demand, re-renders the drawings and
 * charts in the light theme, rasterises them, and lays out an A4 report with
 * inputs, results, breakdowns, warnings and method notes.
 */
(function (root) {
  'use strict';

  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PAGE = { w: 210, h: 297, m: 15 };
  const INK = [11, 11, 11], INK2 = [82, 81, 78], INK3 = [122, 121, 115], RULE = [226, 225, 220], ACCENT = [42, 120, 214];
  const LEVEL_COLORS = { error: [198, 40, 40], warn: [178, 107, 0], info: [42, 120, 214] };

  let loading = null;
  function loadJsPdf() {
    if (root.jspdf) return Promise.resolve(root.jspdf);
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = JSPDF_URL;
        s.onload = () => resolve(root.jspdf);
        s.onerror = () => { loading = null; reject(new Error('Could not load jsPDF')); };
        document.head.appendChild(s);
      });
    }
    return loading;
  }

  // The built-in PDF fonts only cover WinAnsi; map the few symbols we use outside it.
  const SUBS = { '₂': '2', '≤': '<=', '≥': '>=', 'ρ': 'rho', 'μ': 'µ', '→': '->', 'ε': 'eps', 'Δ': 'd', '−': '-', '…': '...', '–': '-', '—': '-', 'Ø': 'Ø', ' ': ' ', ' ': ' ' };
  const clean = (t) => String(t).replace(/[₂≤≥ρμ→εΔ−…–—  ]/g, (c) => SUBS[c]);

  // ---------- SVG → PNG ----------

  const STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
    'stroke-linejoin', 'paint-order', 'opacity', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'visibility'];

  function svgToPng(svg, scale = 3) {
    const vb = svg.viewBox.baseVal;
    const clone = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll('*')];
    const dst = [clone, ...clone.querySelectorAll('*')];
    src.forEach((node, i) => {
      const cs = getComputedStyle(node);
      if (cs.visibility === 'hidden') { dst[i].remove(); return; }
      dst[i].setAttribute('style', STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'));
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', vb.width);
    clone.setAttribute('height', vb.height);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(vb.width * scale);
        c.height = Math.round(vb.height * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve({ data: c.toDataURL('image/png'), w: vb.width, h: vb.height });
      };
      img.onerror = () => reject(new Error('Could not rasterise drawing'));
      img.src = url;
    });
  }

  /** Render the page in light theme, capture the figures, then restore the theme. */
  async function captureFigures() {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'light');
    App.rerender();
    try {
      const grab = (sel) => { const s = document.querySelector(sel + ' svg'); return s ? svgToPng(s) : Promise.resolve(null); };
      const [top, section, chart1, chart2] = await Promise.all([grab('#drawing'), grab('#section'), grab('#chart1'), grab('#chart2')]);
      return { top, section, chart1, chart2 };
    } finally {
      if (prev === null) html.removeAttribute('data-theme'); else html.setAttribute('data-theme', prev);
      App.rerender();
    }
  }

  // ---------- Content ----------

  function inputGroups(s) {
    const { FLUIDS, MATERIALS } = CPData;
    const F = (q, v) => Units.format(q, v);
    const mat = MATERIALS[s.material];
    const k = s.material === 'custom' ? s.kCustom : mat.k;
    const layoutName = { serpentine: 'Serpentine', parallelZ: 'Parallel, Z-type', parallelU: 'Parallel, U-type' }[s.layout];
    const serp = s.layout === 'serpentine';
    const shape = s.shape === 'round' ? `Round, Ø ${F('length', s.D)}`
      : s.shape === 'square' ? `Square, ${F('length', s.cw)}`
      : `Rectangular, ${F('length', s.cw)} wide × ${F('length', s.cd)} deep`;
    const flowQ = { vol: 'volflow', mass: 'massflow', std: 'stdflow' }[s.flowMode];
    const groups = [
      ['Plate', [
        ['Length × width × thickness', `${F('length', s.L)} × ${F('length', s.W)} × ${F('length', s.t)}`],
        ['Material', `${mat.name.replace('…', '')} (k = ${Units.format('conductivity', k)})`],
      ]],
      ['Flow layout', [
        ['Layout', layoutName + (serp && s.circuits > 1 ? `, ${s.circuits} parallel circuits` : '')],
        [serp ? 'Passes' : 'Channels', String(s.count)],
        ['Channels run', s.orient === 'length' ? 'Along length' : 'Along width'],
        ['Edge margin', F('length', s.margin)],
        ...(serp ? [] : [['Header width × depth', `${F('length', s.header)} × ${s.headerDepth > 0 ? F('length', s.headerDepth) : 'channel depth'}`]]),
        ['Port inner diameter', F('length', s.portD)],
      ]],
      ['Channel section', [
        ['Shape', shape],
        ['Wall to heated face', F('length', s.wallHeated)],
        ['Wall roughness', Units.format('roughness', s.roughness)],
      ]],
      ['Coolant', [
        ['Fluid', FLUIDS[s.fluid].name],
        ['Inlet temperature', F('temp', s.Tin)],
        ['Inlet pressure', F('pressure', s.pIn)],
        ['Flow rate', Units.format(flowQ, s.flow)],
      ]],
      ['Thermal requirement', [
        ['Mode', s.mode === 'capacity' ? 'Find max. heat at surface limit' : 'Find surface temperature at heat load'],
        s.mode === 'capacity' ? ['Max. surface temperature', F('temp', s.TsMax)] : ['Heat load', App.fmtPower(s.Q)],
        ['Heat applied over', s.heatArea === 'full' ? 'Whole plate face' : 'Channel area only'],
      ]],
    ];
    return groups;
  }

  // ---------- Layout helpers ----------

  function makeWriter(pdf) {
    let y = PAGE.m;
    const w = {
      get y() { return y; },
      set y(v) { y = v; },
      ensure(h) { if (y + h > PAGE.h - PAGE.m - 8) { pdf.addPage(); y = PAGE.m; } },
      font(size, style = 'normal', color = INK) { pdf.setFont('helvetica', style); pdf.setFontSize(size); pdf.setTextColor(...color); },
      text(t, x, yy, opts) { pdf.text(clean(t), x, yy, opts); },
      heading(t) {
        w.ensure(12);
        y += 2;
        w.font(11, 'bold');
        w.text(t, PAGE.m, y + 4);
        y += 7;
      },
      rule(x1 = PAGE.m, x2 = PAGE.w - PAGE.m) { pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2); pdf.line(x1, y, x2, y); },
      /** Key/value rows; value right-aligned within the column. */
      kvRows(rows, x, width, size = 8.5) {
        for (const [k, v] of rows) {
          const vLines = pdf.splitTextToSize(clean(v), width * 0.55);
          const h = Math.max(1, vLines.length) * 3.9 + 1.6;
          w.ensure(h);
          w.font(size, 'normal', INK2);
          w.text(k, x, y + 3.6);
          w.font(size, 'bold', INK);
          pdf.text(vLines, x + width, y + 3.6, { align: 'right' });
          y += h;
          pdf.setDrawColor(...RULE); pdf.setLineWidth(0.15); pdf.line(x, y, x + width, y);
        }
      },
      image(img, maxW, maxH, x = PAGE.m) {
        if (!img) return 0;
        const k = Math.min(maxW / img.w, maxH / img.h);
        const iw = img.w * k, ih = img.h * k;
        w.ensure(ih + 2);
        pdf.addImage(img.data, 'PNG', x + (maxW - iw) / 2, y, iw, ih, undefined, 'FAST');
        return ih;
      },
    };
    return w;
  }

  /** Two-column grid of key/value rows (flows left column then right). */
  function twoColumnRows(w, rows) {
    const colW = (PAGE.w - 2 * PAGE.m - 8) / 2;
    const half = Math.ceil(rows.length / 2);
    const y0 = w.y;
    w.kvRows(rows.slice(0, half), PAGE.m, colW);
    const yLeft = w.y;
    w.y = y0;
    w.kvRows(rows.slice(half), PAGE.m + colW + 8, colW);
    w.y = Math.max(yLeft, w.y) + 2;
  }

  function breakdown(w, pdf, title, parts, fmtVal, x, width) {
    const total = parts.reduce((a, p) => a + Math.max(0, p.v), 0);
    w.font(9.5, 'bold');
    w.text(title, x, w.y + 3.5);
    let y = w.y + 6;
    // Stacked bar
    let bx = x;
    parts.forEach((p) => {
      const share = Math.max(0, p.v) / total;
      if (share <= 0) return;
      pdf.setFillColor(...p.color);
      pdf.rect(bx, y, Math.max(0.3, width * share - 0.4), 4, 'F');
      bx += width * share;
    });
    y += 6;
    for (const p of parts) {
      if (!(p.v > 0)) continue;
      pdf.setFillColor(...p.color);
      pdf.rect(x, y + 0.9, 2.4, 2.4, 'F');
      w.font(8, 'normal', INK2);
      w.text(p.label, x + 4, y + 3.2);
      w.font(8, 'bold', INK);
      w.text(fmtVal(p.v), x + width - 11, y + 3.2, { align: 'right' });
      w.font(8, 'normal', INK3);
      w.text(`${(100 * p.v / total).toFixed(0)} %`, x + width, y + 3.2, { align: 'right' });
      y += 4.6;
    }
    return y;
  }

  // ---------- Main ----------

  /** Build the report and download it; with { blob: true } return the PDF as a Blob instead. */
  async function exportPdf(opts = {}) {
    const res = App.result();
    if (!res || !res.ok) throw new Error('Resolve the input errors before exporting.');
    const s = App.state();
    const [{ jsPDF }, figs] = await Promise.all([loadJsPdf(), captureFigures()]);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const w = makeWriter(pdf);
    const contentW = PAGE.w - 2 * PAGE.m;
    const now = new Date();
    const fluid = CPData.FLUIDS[s.fluid];

    // Title
    w.font(17, 'bold');
    w.text('Cold plate design report', PAGE.m, w.y + 6);
    w.font(8.5, 'normal', INK3);
    w.text(`${now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} · ${Units.system === 'SI' ? 'SI units' : 'Imperial units'}`, PAGE.w - PAGE.m, w.y + 6, { align: 'right' });
    w.y += 10;
    w.rule();
    w.y += 4;

    // Headline
    const capacity = s.mode === 'capacity';
    pdf.setFillColor(240, 245, 252);
    pdf.roundedRect(PAGE.m, w.y, contentW, 24, 2, 2, 'F');
    w.font(9, 'normal', INK2);
    w.text(capacity ? 'Max. heat dissipation' : 'Peak surface temperature', PAGE.m + 5, w.y + 6.5);
    w.font(22, 'bold', ACCENT);
    w.text(capacity ? App.fmtPower(res.Q) : Units.format('temp', res.TsMax), PAGE.m + 5, w.y + 16);
    w.font(8, 'normal', INK3);
    const sub = capacity
      ? `surface <= ${Units.format('temp', s.TsMax)}, ${Units.format('temp', s.Tin)} ${fluid.short} inlet`
      : `at ${App.fmtPower(s.Q)}, ${Units.format('temp', s.Tin)} ${fluid.short} inlet`;
    w.text(sub, PAGE.m + 5, w.y + 21);
    const side = [
      ['Coolant outlet', Units.format('temp', res.Tout)],
      ['Pressure drop', Units.format('dpressure', res.dp)],
      ['Thermal resistance', Units.format('rth', res.Rth, { digits: 4 })],
    ];
    side.forEach(([k, v], i) => {
      const x = PAGE.m + 80 + i * 33;
      w.font(7.5, 'normal', INK3);
      w.text(k, x, w.y + 9);
      w.font(11, 'bold', INK);
      w.text(v, x, w.y + 15);
    });
    w.y += 28;

    // Figures
    w.heading('Plate layout');
    const topH = w.image(figs.top, contentW, 80);
    w.y += topH + 1;
    w.font(7.5, 'normal', INK3);
    w.text(`Channels coloured by coolant temperature: ${Units.format('temp', res.Tin)} (inlet) to ${Units.format('temp', res.Tout)} (outlet).`, PAGE.m, w.y + 3);
    w.y += 6;
    const secH = w.image(figs.section, contentW, 28);
    w.y += secH + 2;

    // Warnings
    const issues = (res.issues || []).slice().sort((a, b) => ['error', 'warn', 'info'].indexOf(a.level) - ['error', 'warn', 'info'].indexOf(b.level));
    if (issues.length) {
      w.heading('Design checks');
      for (const i of issues) {
        const lines = pdf.splitTextToSize(clean(i.msg), contentW - 20);
        w.ensure(lines.length * 3.8 + 2);
        w.font(7, 'bold', LEVEL_COLORS[i.level]);
        w.text({ error: 'ERROR', warn: 'WARNING', info: 'NOTE' }[i.level], PAGE.m, w.y + 3.4);
        w.font(8.5, 'normal', INK);
        pdf.text(lines, PAGE.m + 20, w.y + 3.4);
        w.y += lines.length * 3.8 + 2;
      }
    }

    // Inputs
    const groups = inputGroups(s);
    const colW = (contentW - 8) / 2;
    const left = groups.slice(0, 3), right = groups.slice(3);
    w.ensure(Math.max(...[left, right].map((gs) => gs.reduce((a, [, rows]) => a + 7.5 + rows.length * 6.2, 0))) + 12);
    w.heading('Design inputs');
    // Keep both columns on one page: reserve the taller column's height up front.
    const est = (gs) => gs.reduce((a, [, rows]) => a + 7.5 + rows.length * 6.2, 0);
    w.ensure(Math.max(est(left), est(right)));
    const y0 = w.y;
    const writeGroups = (gs, x) => {
      for (const [title, rows] of gs) {
        w.ensure(10);
        w.font(8, 'bold', ACCENT);
        w.text(title.toUpperCase(), x, w.y + 4);
        w.y += 5.5;
        w.kvRows(rows, x, colW, 8);
        w.y += 2;
      }
    };
    writeGroups(left, PAGE.m);
    const yL = w.y;
    w.y = y0;
    writeGroups(right, PAGE.m + colW + 8);
    w.y = Math.max(yL, w.y);

    // Results
    w.y += 2;
    w.ensure(50);
    w.heading('Results');
    twoColumnRows(w, App.metricItems(res).map(([k, v, sub2]) => [k, sub2 ? `${v} (${sub2})` : v]));

    // Breakdowns
    w.ensure(48);
    w.y += 2;
    const r = res.resistances, p = res.dpParts;
    const pal = [[42, 120, 214], [235, 104, 52], [27, 175, 122], [237, 161, 0], [232, 123, 164]];
    const yA = breakdown(w, pdf, 'Thermal resistance breakdown', [
      { label: 'Coolant heating (flow capacity)', v: r.capacity, color: pal[0] },
      { label: 'Convection to coolant', v: r.convection, color: pal[1] },
      { label: 'Conduction through wall', v: r.wall, color: pal[2] },
      { label: 'Lateral spreading', v: r.spreading, color: pal[3] },
    ], (v) => Units.format('rth', v, { digits: 4 }), PAGE.m, colW);
    const yB = breakdown(w, pdf, 'Pressure drop breakdown', [
      { label: 'Channel friction', v: p.friction, color: pal[0] },
      { label: '180° bends', v: p.bends, color: pal[1] },
      { label: 'Channel entry/exit', v: p.entryExit, color: pal[2] },
      { label: 'Headers', v: p.headers, color: pal[3] },
      { label: 'Ports', v: p.ports, color: pal[4] },
    ], (v) => Units.format('dpressure', v, { digits: 2 }), PAGE.m + colW + 8, colW);
    w.y = Math.max(yA, yB) + 4;

    // Charts
    w.ensure(75);
    w.heading('Performance vs. flow rate');
    const chartY = w.y;
    w.font(8.5, 'bold', INK2);
    w.text(document.getElementById('chart1-title').textContent, PAGE.m, chartY + 3);
    w.text('Pressure drop vs. flow', PAGE.m + colW + 8, chartY + 3);
    w.y = chartY + 5;
    const h1 = w.image(figs.chart1, colW, 55, PAGE.m);
    w.image(figs.chart2, colW, 55, PAGE.m + colW + 8);
    w.y += h1 + 4;

    // Method
    w.heading('Method and limits');
    const method = [
      'This is a 1D thermal-resistance and pressure-drop estimate for concept sizing. Expect roughly ±20-30 % compared with CFD or test data.',
      'Laminar flow: Shah & London Nu(H1) and f·Re for the channel aspect ratio with entry corrections. Turbulent flow: Gnielinski with Haaland friction. Re 2300-4000 is blended.',
      'Channel walls are treated as fins, with conduction through the heated-face wall and lateral spreading. Plate temperature is blended between the uniform-flux (conservative) and isothermal-plate (ideal) limits.',
      'Not modelled: TIM and contact resistance, discrete heat sources, flow maldistribution (warning only), two-phase flow, gas compressibility within the plate.',
    ];
    w.font(8, 'normal', INK2);
    for (const para of method) {
      const lines = pdf.splitTextToSize(clean(para), contentW);
      w.ensure(lines.length * 3.6 + 1.5);
      pdf.text(lines, PAGE.m, w.y + 3.2);
      w.y += lines.length * 3.6 + 1.5;
    }
    w.ensure(10);
    w.y += 2;
    w.font(8, 'normal', INK3);
    w.text('Open this design in the calculator:', PAGE.m, w.y + 3);
    const link = App.shareUrl();
    w.font(8, 'normal', ACCENT);
    pdf.textWithLink('Cold Plate Calculator (link with all inputs)', PAGE.m + 50, w.y + 3, { url: link });

    // Footer on every page
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
      pdf.line(PAGE.m, PAGE.h - 11, PAGE.w - PAGE.m, PAGE.h - 11);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...INK3);
      pdf.text('Cold Plate Calculator v1 · 1D engineering estimate, validate final designs by CFD or test', PAGE.m, PAGE.h - 7);
      pdf.text(`Page ${i} of ${pages}`, PAGE.w - PAGE.m, PAGE.h - 7, { align: 'right' });
    }

    if (opts.blob) return pdf.output('blob');
    const stamp = now.toISOString().slice(0, 10);
    pdf.save(`cold-plate-report-${stamp}.pdf`);
  }

  root.Report = { exportPdf };
})(window);
