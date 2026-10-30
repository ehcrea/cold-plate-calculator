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
  const OK_GREEN = [0, 131, 0], DIFF_BG = [255, 240, 210];
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

  const t = (text, p) => I18N.t(text, p);

  // Turkish needs glyphs outside WinAnsi (ş, ğ, ı, İ): embed DejaVu Sans for it.
  const FONT_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/';
  const fontCache = {};
  let FONT = 'helvetica', unicode = false;
  async function fetchFontBase64(file) {
    if (!fontCache[file]) {
      fontCache[file] = fetch(FONT_URL + file).then((r) => {
        if (!r.ok) throw new Error('Font download failed');
        return r.arrayBuffer();
      }).then((buf) => {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(bin);
      }).catch((e) => { delete fontCache[file]; throw e; });
    }
    return fontCache[file];
  }
  /**
   * Embed DejaVu Sans: always for the formulas of the calculation appendix (Greek letters, ṁ, √),
   * and for the body text in Turkish. Falls back to Helvetica with transliteration.
   */
  let MATH = 'helvetica', mathUnicode = false;
  async function setupFont(pdf) {
    FONT = 'helvetica'; unicode = false; MATH = 'helvetica'; mathUnicode = false;
    try {
      const [reg, bold] = await Promise.all([fetchFontBase64('DejaVuSans.ttf'), fetchFontBase64('DejaVuSans-Bold.ttf')]);
      pdf.addFileToVFS('DejaVuSans.ttf', reg);
      pdf.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
      pdf.addFileToVFS('DejaVuSans-Bold.ttf', bold);
      pdf.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
      MATH = 'DejaVu'; mathUnicode = true;
      if (I18N.lang === 'tr') { FONT = 'DejaVu'; unicode = true; }
    } catch (e) {
      console.warn('Unicode font unavailable, transliterating', e);
    }
  }
  const TR_ASCII = { 'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I' };

  // The built-in PDF fonts only cover WinAnsi; map the few symbols we use outside it.
  const SUBS = { '≈': '~', '₂': '2', '≤': '<=', '≥': '>=', 'ρ': 'rho', 'μ': 'µ', '→': '->', 'ε': 'eps', 'Δ': 'd', '−': '-', '…': '...', '–': '-', '—': '-', 'Ø': 'Ø', ' ': ' ', ' ': ' ' };
  const clean = (str) => (unicode ? String(str) : String(str).replace(/[şŞğĞıİ]/g, (c) => TR_ASCII[c]).replace(/[≈₂≤≥ρμ→εΔ−…–—  ]/g, (c) => SUBS[c]));

  // Formula symbols outside WinAnsi, for the Helvetica fallback.
  const MATH_SUBS = { 'π': 'pi', 'η': 'eta', 'α': 'alpha', 'ε': 'eps', 'μ': 'mu', 'ρ': 'rho', 'Δ': 'd', '√': 'sqrt', '∇': 'grad ', 'ṁ': 'm', 'ṅ': 'n', '̇': '', '̄': '', '″': '"',
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', '−': '-', '→': '->', '½': '1/2' };
  const mathClean = (str) => (mathUnicode ? String(str) : clean(String(str).replace(/[πηαεμρΔ√∇ṁṅ̇̄″⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺−→]/g, (c) => MATH_SUBS[c])));

  /**
   * Draw formula markup (_{sub}, ^{sup}) with real sub/superscripts, wrapping at spaces.
   * Returns the height used [mm]; with dry = true it only measures.
   */
  function richText(pdf, markup, x, y, size, maxW, style = 'normal', dry = false) {
    const LH = size * 0.3528 * 1.35;
    const words = String(markup).split(/( +)/).filter((w) => w.length);
    const segs = (word) => word.split(/(_\{[^}]*\}|\^\{[^}]*\})/).filter(Boolean).map((p) => {
      const m = p.match(/^([_^])\{([^}]*)\}$/);
      return m ? { txt: mathClean(m[2]), mode: m[1] } : { txt: mathClean(p), mode: '' };
    });
    const width = (ss) => ss.reduce((a, g) => { pdf.setFontSize(g.mode ? size * 0.7 : size); return a + pdf.getTextWidth(g.txt); }, 0);
    pdf.setFont(MATH, style);
    let cx = x, cy = y, lines = 1;
    for (const w of words) {
      const ss = segs(w), ww = width(ss);
      if (/^ +$/.test(w)) { if (cx > x) cx += ww; continue; }
      if (cx > x && cx + ww > x + maxW) { cx = x + 4; cy += LH; lines++; }
      for (const g of ss) {
        const fs = g.mode ? size * 0.7 : size;
        pdf.setFontSize(fs);
        const dy = g.mode === '_' ? size * 0.3528 * 0.25 : g.mode === '^' ? -size * 0.3528 * 0.38 : 0;
        if (!dry) pdf.text(g.txt, cx, cy + dy);
        cx += pdf.getTextWidth(g.txt);
      }
    }
    pdf.setFontSize(size);
    return lines * LH;
  }

  /**
   * Table with a wide first column. rows: { section } | { cells, marks?, mark: 'best' | 'diff', bold? }.
   */
  function dataTable(pdf, w, headers, rows, firstW) {
    const contentW = PAGE.w - 2 * PAGE.m;
    const n = headers.length;
    const colW = (contentW - firstW) / Math.max(1, n - 1);
    const left = (i) => (i === 0 ? PAGE.m : PAGE.m + firstW + (i - 1) * colW);
    const size = n > 5 ? 7 : 7.5, LH = size * 0.3528 * 1.25;
    const lines = (txt, i) => pdf.splitTextToSize(clean(txt), (i === 0 ? firstW : colW) - 2.5);
    const head = () => {
      w.font(size, 'bold', INK3);
      const hl = headers.map((h, i) => lines(h, i));
      const hh = Math.max(...hl.map((l) => l.length)) * LH + 1.5;
      hl.forEach((l, i) => pdf.text(l, i === 0 ? left(0) : left(i) + colW - 1, w.y + LH, { align: i === 0 ? 'left' : 'right' }));
      w.y += hh;
      pdf.setDrawColor(...INK3); pdf.setLineWidth(0.25); pdf.line(PAGE.m, w.y, PAGE.m + contentW, w.y);
    };
    w.ensure(12);
    head();
    for (const r of rows) {
      if (r.section) {
        w.ensure(7);
        w.font(6.5, 'bold', INK3);
        pdf.text(clean(r.section.toLocaleUpperCase(I18N.locale)), PAGE.m, w.y + 4.2);
        w.y += 5.2;
        continue;
      }
      w.font(size);
      const cl = r.cells.map((c, i) => lines(c, i));
      const h = Math.max(...cl.map((l) => l.length)) * LH + 1.8;
      if (w.y + h > PAGE.h - PAGE.m - 8) { pdf.addPage(); w.y = PAGE.m; head(); }
      cl.forEach((l, i) => {
        const marked = r.marks && r.marks[i];
        if (marked && r.mark === 'diff') { pdf.setFillColor(...DIFF_BG); pdf.rect(left(i) + 0.8, w.y + 0.3, (i === 0 ? firstW : colW) - 0.8, h - 0.6, 'F'); }
        const best = marked && r.mark === 'best';
        w.font(size, i > 0 && (best || r.bold) ? 'bold' : 'normal', i === 0 ? INK2 : best ? OK_GREEN : INK);
        pdf.text(l, i === 0 ? left(0) : left(i) + colW - 1, w.y + LH + 0.4, { align: i === 0 ? 'left' : 'right' });
      });
      w.y += h;
      pdf.setDrawColor(...RULE); pdf.setLineWidth(0.15); pdf.line(PAGE.m, w.y, PAGE.m + contentW, w.y);
    }
    w.y += 3;
  }

  /** Design comparison and parameter sweep, when the user has made them. */
  function studySections(pdf, w, figs) {
    const data = App.studyReport();
    const contentW = PAGE.w - 2 * PAGE.m, colW = (contentW - 8) / 2;
    const note = (txt) => {
      w.font(7.5, 'normal', INK3);
      const l = pdf.splitTextToSize(clean(txt), contentW);
      pdf.text(l, PAGE.m, w.y + 2.5);
      w.y += l.length * 3.3 + 1.5;
    };
    const tr = App.transientReport();
    if (tr) {
      w.ensure(80);
      w.heading(t('Transient load'));
      note(tr.profile);
      if (tr.note) note(tr.note);
      if (figs.tr1) {
        const y0 = w.y;
        const h1 = w.image(figs.tr1, colW, 55, PAGE.m);
        w.y = y0;
        const h2 = w.image(figs.tr2, colW, 55, PAGE.m + colW + 8);
        w.y = y0 + Math.max(h1, h2) + 3;
      }
      twoColumnRows(w, tr.rows);
    }
    if (data.compare) {
      w.ensure(40);
      w.heading(t('Design comparison'));
      note(t('Best value in each row in green; shaded cells mark inputs that differ from the current design.'));
      dataTable(pdf, w, data.compare.headers, data.compare.rows, 42);
    }
    if (data.sweep) {
      w.ensure(80);
      w.heading(t('Parameter sweep'));
      note(data.sweep.title);
      if (figs.sweep1) {
        const y0 = w.y;
        const h1 = w.image(figs.sweep1, colW, 55, PAGE.m);
        w.y = y0;
        const h2 = w.image(figs.sweep2, colW, 55, PAGE.m + colW + 8);
        w.y = y0 + Math.max(h1, h2) + 3;
      }
      dataTable(pdf, w, data.sweep.headers, data.sweep.rows, 30);
    }
  }

  /** Appendix: the step-by-step calculation with formulas and substituted values. */
  function stepsAppendix(pdf, w, res) {
    const st = App.calcSteps(res);
    const contentW = PAGE.w - 2 * PAGE.m;
    pdf.addPage();
    w.y = PAGE.m;
    w.font(14, 'bold');
    w.text(t('Appendix: step-by-step calculation'), PAGE.m, w.y + 5);
    w.y += 9;
    w.font(8, 'normal', INK3);
    const intro = pdf.splitTextToSize(clean(t('The 1D model written out: each formula with this design\'s numbers substituted, in SI units. Use it to check results by hand or for teaching.')), contentW);
    pdf.text(intro, PAGE.m, w.y + 3);
    w.y += intro.length * 3.6 + 2;
    let k = 0;
    st.sections.forEach((sec, i) => {
      w.ensure(16);
      w.y += 2;
      pdf.setTextColor(...INK);
      w.y += richText(pdf, `${i + 1}. ${sec.title}${sec.intro ? ' · ' + sec.intro : ''}`, PAGE.m, w.y + 4, 10.5, contentW, 'bold') + 1.5;
      for (const s of sec.steps) {
        k++;
        // Measured with a dry run first so a page break never splits a step.
        const draw = (dry) => {
          const y0 = w.y, X = PAGE.m + 7, W = contentW - 7;
          pdf.setTextColor(...ACCENT);
          pdf.setFont(MATH, 'bold'); pdf.setFontSize(8);
          if (!dry) pdf.text(String(k), PAGE.m, w.y + 3.4);
          pdf.setTextColor(...INK);
          w.y += richText(pdf, s.title, X, w.y + 3.4, 8.5, W, 'bold', dry) + 0.6;
          if (s.f) w.y += richText(pdf, s.f, X, w.y + 3.4, 9, W, 'normal', dry) + 0.4;
          pdf.setTextColor(...INK2);
          if (s.sub) w.y += richText(pdf, s.sub, X, w.y + 3.4, 8.5, W, 'normal', dry) + 0.4;
          pdf.setTextColor(...INK);
          if (s.r) w.y += richText(pdf, s.r, X, w.y + 3.4, 9, W, 'bold', dry) + 0.4;
          pdf.setTextColor(...INK3);
          if (s.note) w.y += richText(pdf, s.note, X, w.y + 3.2, 7.5, W, 'normal', dry) + 0.4;
          w.y += 1.6;
          const h = w.y - y0;
          if (dry) w.y = y0;
          return h;
        };
        w.ensure(draw(true));
        draw(false);
        w.rule();
      }
      w.y += 2;
    });
    w.heading(t('References'));
    w.font(7.5, 'normal', INK2);
    st.references.forEach((r, i) => {
      const lines = pdf.splitTextToSize(clean(`${i + 1}. ${r}`), contentW);
      w.ensure(lines.length * 3.4 + 1);
      pdf.text(lines, PAGE.m, w.y + 3);
      w.y += lines.length * 3.4 + 1;
    });
  }

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
      // The thermal curve is computed in the background; wait for it to finish drawing.
      for (let i = 0; i < 100 && !document.querySelector('#chart1 svg') && App.thermal(); i++) await new Promise((r) => setTimeout(r, 50));
      const grab = (sel) => { const s = document.querySelector(sel + ' svg'); return s ? svgToPng(s) : Promise.resolve(null); };
      const [top, section, map, chart1, chart2, dist, sweep1, sweep2, tr1, tr2] = await Promise.all([grab('#drawing'), grab('#section'), grab('#map'), grab('#chart1'), grab('#chart2'), grab('#dist-chart'), grab('#sweep-chart1'), grab('#sweep-chart2'), grab('#tr-chart1'), grab('#tr-chart2')]);
      return { top, section, map, chart1, chart2, dist, sweep1, sweep2, tr1, tr2 };
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
    const layoutName = t({ serpentine: 'Serpentine', parallelZ: 'Parallel, Z-type', parallelU: 'Parallel, U-type' }[s.layout]);
    const serp = s.layout === 'serpentine';
    const shape = s.shape === 'round' ? t('Round, Ø {d}', { d: F('length', s.D) })
      : s.shape === 'square' ? t('Square, {a}', { a: F('length', s.cw) })
      : t('Rectangular, {w} wide × {d} deep', { w: F('length', s.cw), d: F('length', s.cd) });
    const flowQ = { vol: 'volflow', mass: 'massflow', std: 'stdflow' }[s.flowMode];
    const groups = [
      ['Plate', [
        ['Length × width × thickness', `${F('length', s.L)} × ${F('length', s.W)} × ${F('length', s.t)}`],
        ['Material', `${t(mat.name).replace('…', '')} (k = ${Units.format('conductivity', k)})`],
      ]],
      ['Flow layout', [
        ['Layout', layoutName + (serp && s.circuits > 1 ? t(', {n} parallel circuits', { n: s.circuits }) : '')],
        [serp ? 'Passes' : 'Channels', String(s.count)],
        ['Channels run', t(s.orient === 'length' ? 'Along length' : 'Along width')],
        ['Edge margin', F('length', s.margin)],
        ...(serp ? [] : [['Header width × depth', `${F('length', s.header)} × ${s.headerDepth > 0 ? F('length', s.headerDepth) : t('channel depth')}`]]),
        ['Port inner diameter', F('length', s.portD)],
      ]],
      ['Channel section', [
        ['Shape', shape],
        ['Wall to heated face', F('length', s.wallHeated)],
        ['Wall roughness', Units.format('roughness', s.roughness)],
      ]],
      ['Coolant', [
        ['Fluid', t(FLUIDS[s.fluid].name).replace('…', '')],
        ...(s.fluid === 'custom' ? [['Custom properties', `rho ${F('density', s.customFluid.rho)}, cp ${F('cp', s.customFluid.cp)}, k ${F('conductivity', s.customFluid.k)}, mu ${F('viscosity', s.customFluid.mu)}`]] : []),
        ['Inlet temperature', F('temp', s.Tin)],
        ['Inlet pressure', F('pressure', s.pIn)],
        ...flowRows(s, flowQ),
      ]],
      ['Heat input', s.heatArea === 'sources' ? [
        ['Heat applied as', s.sources.length === 1 ? t('1 discrete heat source') : t('{n} discrete heat sources', { n: s.sources.length })],
        ['Total power', App.fmtPower(s.sources.reduce((a, x) => a + x.P, 0))],
      ] : [
        ['Heat applied as', t(s.heatArea === 'full' ? 'Uniform over whole plate face' : 'Uniform over channel area')],
        ['Mode', t(s.mode === 'capacity' ? 'Find max. heat at surface limit' : 'Find surface temperature at heat load')],
        s.mode === 'capacity' ? ['Max. surface temperature', F('temp', s.TsMax)] : ['Heat load', App.fmtPower(s.Q)],
      ]],
    ];
    return groups;
  }

  function flowRows(s, flowQ) {
    if (s.flowSource !== 'pump') return [['Flow rate', Units.format(flowQ, s.flow)]];
    const op = App.op();
    const pumpName = CPData.PUMPS[s.pump.preset] ? t(CPData.PUMPS[s.pump.preset].name) : t('Custom curve ({n} points)', { n: s.pump.points.length });
    const rows = [
      ['Flow source', pumpName],
      ['Rest of loop', s.pump.extQ > 0 ? t('{dp} at {q}', { dp: Units.format('dpressure', s.pump.extDp), q: Units.format('volflow', s.pump.extQ) }) : t('none')],
    ];
    if (op && op.ok) rows.push(['Operating point', t('{dp} at {q}', { q: Units.format('volflow', op.q), dp: Units.format('dpressure', op.dpPump) })]);
    return rows;
  }

  // ---------- Layout helpers ----------

  function makeWriter(pdf) {
    let y = PAGE.m;
    const w = {
      get y() { return y; },
      set y(v) { y = v; },
      ensure(h) { if (y + h > PAGE.h - PAGE.m - 8) { pdf.addPage(); y = PAGE.m; } },
      font(size, style = 'normal', color = INK) { pdf.setFont(FONT, style); pdf.setFontSize(size); pdf.setTextColor(...color); },
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
      // Long (translated) labels are shortened so they never run into the value column.
      let lbl = clean(p.label);
      while (lbl.length > 4 && pdf.getTextWidth(lbl) > width - 34) lbl = lbl.slice(0, -4) + '...';
      w.text(lbl, x + 4, y + 3.2);
      w.font(8, 'bold', INK);
      w.text(fmtVal(p.v), x + width - 11, y + 3.2, { align: 'right' });
      w.font(8, 'normal', INK3);
      w.text(I18N.pct((100 * p.v / total).toFixed(0)), x + width, y + 3.2, { align: 'right' });
      y += 4.6;
    }
    return y;
  }

  // ---------- Main ----------

  /** Build the report and download it; with { blob: true } return the PDF as a Blob instead. */
  async function exportPdf(opts = {}) {
    const res = App.result();
    const th = App.thermal();
    if (!res || !res.ok || !th) throw new Error(t('Resolve the input errors before exporting.'));
    const s = App.state();
    const [{ jsPDF }, figs] = await Promise.all([loadJsPdf(), captureFigures()]);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    await setupFont(pdf);
    const w = makeWriter(pdf);
    const contentW = PAGE.w - 2 * PAGE.m;
    const now = new Date();
    const fluid = CPData.FLUIDS[s.fluid];

    // Title
    w.font(17, 'bold');
    w.text(t('Cold plate design report'), PAGE.m, w.y + 6);
    w.font(8.5, 'normal', INK3);
    w.text(`${now.toLocaleDateString(I18N.locale, { year: 'numeric', month: 'long', day: 'numeric' })} · ${t(Units.system === 'SI' ? 'SI units' : 'Imperial units')}`, PAGE.w - PAGE.m, w.y + 6, { align: 'right' });
    w.y += 10;
    w.rule();
    w.y += 4;

    // Headline
    const capacity = s.mode === 'capacity';
    const map = App.map();
    pdf.setFillColor(240, 245, 252);
    pdf.roundedRect(PAGE.m, w.y, contentW, 24, 2, 2, 'F');
    let label, value, sub;
    const inlet = t('{T} {fluid} inlet', { T: Units.format('temp', s.Tin), fluid: fluid.short });
    if (th.src) {
      const hot = map.sources.reduce((a, r) => (r.Tj > a.Tj ? r : a));
      label = t('Hottest component: {name}', { name: hot.name });
      value = Units.format('temp', hot.Tj);
      sub = t('{Q} total, {inlet}; power headroom x{f}', { Q: App.fmtPower(th.Q), inlet, f: Units.fmtNumber(map.headroom, 2) });
    } else if (capacity) {
      label = t('Max. heat dissipation');
      value = App.fmtPower(th.Q);
      sub = t('peak surface <= {T}, {inlet}', { T: Units.format('temp', s.TsMax), inlet });
    } else {
      label = t('Peak surface temperature');
      value = Units.format('temp', th.Tpeak);
      sub = t('at {Q}, {inlet}', { Q: App.fmtPower(s.Q), inlet });
    }
    w.font(9, 'normal', INK2);
    w.text(label, PAGE.m + 5, w.y + 6.5);
    w.font(22, 'bold', ACCENT);
    w.text(value, PAGE.m + 5, w.y + 16);
    w.font(8, 'normal', INK3);
    w.text(sub, PAGE.m + 5, w.y + 21);
    const side = [
      th.src ? ['Peak plate surface', Units.format('temp', th.Tpeak)] : ['Coolant outlet', Units.format('temp', th.Tout)],
      ['Pressure drop', Units.format('dpressure', res.dp)],
      th.src ? ['Coolant outlet', Units.format('temp', th.Tout)] : ['Thermal resistance', Units.format('rth', th.Rth, { digits: 4 })],
    ];
    side.forEach(([k, v], i) => {
      const x = PAGE.m + 80 + i * 33;
      w.font(7.5, 'normal', INK3);
      w.text(t(k), x, w.y + 9);
      w.font(11, 'bold', INK);
      w.text(v, x, w.y + 15);
    });
    w.y += 28;

    // Figures
    w.heading(t('Plate layout'));
    const topH = w.image(figs.top, contentW, 80);
    w.y += topH + 1;
    w.font(7.5, 'normal', INK3);
    const hotOut = res.dist && map ? Math.max(...map.paths.map((p) => p.Tout)) : null;
    w.text(hotOut
      ? t('Channels coloured by coolant temperature: {a} (inlet) to {b} (hottest channel outlet).', { a: Units.format('temp', s.Tin), b: Units.format('temp', hotOut) })
      : t('Channels coloured by coolant temperature: {a} (inlet) to {b} (outlet).', { a: Units.format('temp', s.Tin), b: Units.format('temp', th.Tout) }), PAGE.m, w.y + 3);
    w.y += 6;
    const secH = w.image(figs.section, contentW, 28);
    w.y += secH + 2;

    // Temperature map
    if (figs.map && map) {
      w.ensure(80);
      w.heading(t('Plate surface temperature (2D)'));
      const mh = w.image(figs.map, contentW, 80);
      w.y += mh + 1;
      w.font(7.5, 'normal', INK3);
      w.text(t('Colour scale {a} (light) to {b} (dark red); ring marks the hottest point. Grid {nx} x {ny} cells.', { a: Units.format('temp', map.Tmin), b: Units.format('temp', map.Tmax), nx: map.grid.nx, ny: map.grid.ny }), PAGE.m, w.y + 3);
      w.y += 6;
    }

    // Components
    if (th.src && map.sources.length) {
      w.ensure(20 + 6 * map.sources.length);
      w.heading(t('Component temperatures'));
      const cols = [['Component', 0, 'left'], ['Power', 46, 'right'], ['Plate avg / max', 80, 'right'], ['TIM ΔT', 97, 'right'], ['Case', 114, 'right'], ['Junction', 133, 'right'], ['Limit', 149, 'right'], ['Margin', 165, 'right'], ['Status', 180, 'right']];
      w.font(7.5, 'normal', INK3);
      cols.forEach(([h, x, al]) => w.text(t(h), PAGE.m + x, w.y + 3, { align: al }));
      w.y += 4.5;
      w.rule();
      for (const r of App.sourceRows(map)) {
        w.ensure(6);
        const vals = [r.name, r.P, r.plate, r.dtim, r.tcase, r.tj, r.limit, r.margin, t(r.ok ? 'OK' : 'OVER')];
        vals.forEach((v, i) => {
          const [, x, al] = cols[i];
          if (i === 8) w.font(8, 'bold', r.ok ? [0, 131, 0] : LEVEL_COLORS.error);
          else w.font(8, i === 5 ? 'bold' : 'normal', INK);
          w.text(v, PAGE.m + x, w.y + 4, { align: al });
        });
        w.y += 5.5;
        w.rule();
      }
      w.y += 3;

      // Source definitions: footprint, position and interface stack.
      w.ensure(16 + 6 * s.sources.length);
      w.heading(t('Heat source definitions'));
      const dcols = [['Component', 0, 'left'], ['Footprint (L x W)', 56, 'right'], ['Centre (x, y)', 84, 'right'], ['TIM', 88, 'left'], ['Impedance', 165, 'right'], ['Rjc', 180, 'right']];
      w.font(7.5, 'normal', INK3);
      dcols.forEach(([h, x, al]) => w.text(t(h), PAGE.m + x, w.y + 3, { align: al }));
      w.y += 4.5;
      w.rule();
      for (const src of s.sources) {
        w.ensure(6);
        const tim = CPData.TIMS[src.timType] || CPData.TIMS.custom;
        const vals = [
          src.name,
          `${Units.format('length', src.w)} x ${Units.format('length', src.h)}`,
          `${Units.format('length', src.x, { noUnit: true })}, ${Units.format('length', src.y)}`,
          `${t(tim.name).replace('…', '').replace(/\s*\(.*\)/, '')}, ${Units.format('length', src.tim)}, k ${Units.format('conductivity', src.kTim)}`,
          Units.format('impedance', App.timOf(src).z, { digits: 3 }),
          Units.format('rth', src.rjc || 0, { digits: 3 }),
        ];
        vals.forEach((v, i) => {
          const [, x, al] = dcols[i];
          w.font(i === 3 ? 7 : 8, 'normal', INK);
          let txt = clean(v);
          if (i === 3) while (txt.length > 4 && pdf.getTextWidth(txt) > 52) txt = txt.slice(0, -4) + '...';
          w.text(txt, PAGE.m + x, w.y + 4, { align: al });
        });
        w.y += 5.5;
        w.rule();
      }
      w.font(7.5, 'normal', INK3);
      w.text(t('Impedance = TIM thickness / conductivity + contact resistance (both faces).'), PAGE.m, w.y + 3);
      w.y += 6;
    }

    // Warnings
    const issues = (res.issues || []).slice().sort((a, b) => ['error', 'warn', 'info'].indexOf(a.level) - ['error', 'warn', 'info'].indexOf(b.level));
    if (issues.length) {
      w.heading(t('Design checks'));
      for (const i of issues) {
        const lines = pdf.splitTextToSize(clean(i.tpl ? t(i.tpl, i.params) : i.msg), contentW - 20);
        w.ensure(lines.length * 3.8 + 2);
        w.font(7, 'bold', LEVEL_COLORS[i.level]);
        w.text(t({ error: 'ERROR', warn: 'WARNING', info: 'NOTE' }[i.level]), PAGE.m, w.y + 3.4);
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
    w.heading(t('Design inputs'));
    // Keep both columns on one page: reserve the taller column's height up front.
    const est = (gs) => gs.reduce((a, [, rows]) => a + 7.5 + rows.length * 6.2, 0);
    w.ensure(Math.max(est(left), est(right)));
    const y0 = w.y;
    const writeGroups = (gs, x) => {
      for (const [title, rows] of gs) {
        w.ensure(10);
        w.font(8, 'bold', ACCENT);
        w.text(t(title).toLocaleUpperCase(I18N.locale), x, w.y + 4);
        w.y += 5.5;
        w.kvRows(rows.map(([k, v]) => [t(k), v]), x, colW, 8);
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
    w.heading(t('Results'));
    twoColumnRows(w, App.metricItems(res).map(([k, v, sub2]) => [k, sub2 ? `${v} (${sub2})` : v]));

    // Breakdowns
    w.ensure(48);
    w.y += 2;
    const r = res.resistances, p = res.dpParts;
    const pal = [[42, 120, 214], [235, 104, 52], [27, 175, 122], [237, 161, 0], [232, 123, 164]];
    const yA = breakdown(w, pdf, t('Thermal resistance breakdown'), [
      { label: t('Coolant heating (flow capacity)'), v: r.capacity, color: pal[0] },
      { label: t('Convection to coolant'), v: r.convection, color: pal[1] },
      { label: t('Conduction through wall'), v: r.wall, color: pal[2] },
      { label: t('Lateral spreading'), v: r.spreading, color: pal[3] },
    ], (v) => Units.format('rth', v, { digits: 4 }), PAGE.m, colW);
    const yB = breakdown(w, pdf, t('Pressure drop breakdown'), [
      { label: t('Channel friction'), v: p.friction, color: pal[0] },
      { label: t('180° bends'), v: p.bends, color: pal[1] },
      { label: t('Channel entry/exit'), v: p.entryExit, color: pal[2] },
      { label: t('Headers'), v: p.headers, color: pal[3] },
      { label: t('Ports'), v: p.ports, color: pal[4] },
    ], (v) => Units.format('dpressure', v, { digits: 2 }), PAGE.m + colW + 8, colW);
    w.y = Math.max(yA, yB) + 4;

    // Flow distribution (parallel layouts)
    if (res.dist && figs.dist) {
      w.ensure(70);
      w.heading(t('Flow distribution between channels'));
      w.font(8, 'normal', INK2);
      w.text(App.distSummary(res), PAGE.m, w.y + 2);
      w.y += 4;
      const dh = w.image(figs.dist, contentW * 0.75, 52, PAGE.m + contentW * 0.125);
      w.y += dh + 2;
      w.font(7.5, 'normal', INK3);
      w.text(t('Channel 1 is nearest the inlet port. Dashed line = average flow.'), PAGE.m, w.y + 2);
      w.y += 5;
    }

    // Charts
    w.ensure(75);
    w.heading(t('Performance vs. flow rate'));
    w.font(7.5, 'normal', INK3);
    w.text(t(s.flowSource === 'pump'
      ? 'Thermal curve from the 2D model. Right: pump curve vs. system curve (plate + rest of loop); the intersection is the operating point.'
      : 'Thermal curve from the 2D model; pressure drop from the 1D hydraulic model.'), PAGE.m, w.y + 1);
    w.y += 3;
    const chartY = w.y;
    w.font(8.5, 'bold', INK2);
    w.text(document.getElementById('chart1-title').textContent, PAGE.m, chartY + 3);
    w.text(document.getElementById('chart2-title').textContent, PAGE.m + colW + 8, chartY + 3);
    w.y = chartY + 5;
    const h1 = w.image(figs.chart1, colW, 55, PAGE.m);
    w.image(figs.chart2, colW, 55, PAGE.m + colW + 8);
    w.y += h1 + 4;

    studySections(pdf, w, figs);

    // Method
    w.heading(t('Method and limits'));
    const method = [
      'This is an engineering estimate for concept sizing: a 2D plate conduction model coupled to 1D channel hydraulics. Expect roughly ±15-30 % compared with CFD or test data.',
      'Laminar flow: Shah & London Nu(H1) and f·Re for the channel aspect ratio with entry corrections. Turbulent flow: Gnielinski with Haaland friction. Re 2300-4000 is blended.',
      '2D plate model: finite-difference grid over the plate face with in-plane conduction through the local solid thickness. Cells above channels and headers are coupled to the coolant through the heated-face wall and convective film (fin-corrected), and the coolant is marched along each channel path. Components add a TIM layer ((t/k + contact resistance)/A) and junction-to-case resistance.',
      'Parallel layouts: the flow split between channels comes from a manifold network model (header friction and momentum against the pressure drop of each channel), and the flow in each channel sets its own heat transfer in the 2D model.',
      'Transient load: implicit (backward-Euler) time stepping of the same 2D plate model with the heat capacity of the plate and, optionally, of each component; the coolant is treated as quasi-steady because it passes through the plate in a fraction of a second. Junction-to-case and TIM layers have no heat capacity, so their share of a load change appears at once (conservative).',
      'Not modelled: through-thickness spreading under small sources, contact resistance beyond the TIM layer, two-phase flow, gas compressibility within the plate.',
    ].map((m) => t(m));
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
    const openTxt = clean(t('Open this design in the calculator:'));
    w.text(openTxt, PAGE.m, w.y + 3);
    const linkX = PAGE.m + pdf.getTextWidth(openTxt) + 3;
    const link = App.shareUrl();
    w.font(8, 'normal', ACCENT);
    pdf.textWithLink(clean(t('Cold Plate Calculator (link with all inputs)')), linkX, w.y + 3, { url: link });

    stepsAppendix(pdf, w, res);

    // Footer on every page
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
      pdf.line(PAGE.m, PAGE.h - 11, PAGE.w - PAGE.m, PAGE.h - 11);
      pdf.setFont(FONT, 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...INK3);
      pdf.text(clean(t('Cold Plate Calculator v2 · engineering estimate, validate final designs by CFD or test')), PAGE.m, PAGE.h - 7);
      pdf.text(clean(t('Page {i} of {n}', { i, n: pages })), PAGE.w - PAGE.m, PAGE.h - 7, { align: 'right' });
    }

    if (opts.blob) return pdf.output('blob');
    const stamp = now.toISOString().slice(0, 10);
    pdf.save(`cold-plate-report-${stamp}.pdf`);
  }

  root.Report = { exportPdf };
})(window);
