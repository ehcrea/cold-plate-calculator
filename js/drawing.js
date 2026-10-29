/*
 * SVG drawings: plate top view with channels coloured by coolant temperature,
 * and a cross-section detail. Geometry is computed in (u, v) plate coordinates,
 * u along the channel runs and v across them, then mapped to screen x/y.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, attrs = {}) {
    const t = el('text', Object.assign({ x, y }, attrs), parent);
    t.textContent = str;
    return t;
  }

  function cssColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(c0, c1, f) {
    const a = hexToRgb(c0), b = hexToRgb(c1);
    const c = a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, Math.max(0, f))));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function fmtLen(m) { return Units.format('length', m); }

  /** Draw a horizontal or vertical dimension line with a centred label. */
  function dimLine(svg, x1, y1, x2, y2, label, vertical) {
    const g = el('g', {}, svg);
    el('line', { x1, y1, x2, y2, class: 'dim' }, g);
    const tick = 4;
    if (vertical) {
      el('line', { x1: x1 - tick, y1, x2: x1 + tick, y2: y1, class: 'dim' }, g);
      el('line', { x1: x2 - tick, y1: y2, x2: x2 + tick, y2, class: 'dim' }, g);
      const t = text(g, x1 - 8, (y1 + y2) / 2, label, { class: 'dim-text', 'text-anchor': 'middle' });
      t.setAttribute('transform', `rotate(-90 ${x1 - 8} ${(y1 + y2) / 2})`);
    } else {
      el('line', { x1, y1: y1 - tick, x2: x1, y2: y1 + tick, class: 'dim' }, g);
      el('line', { x1: x2, y1: y2 - tick, x2, y2: y2 + tick, class: 'dim' }, g);
      text(g, (x1 + x2) / 2, y1 + 16, label, { class: 'dim-text', 'text-anchor': 'middle' });
    }
  }

  function drawTop(container, s, res) {
    const avail = container.clientWidth || 760;
    container.textContent = '';
    const g = res.geometry;
    const Lmm = s.L * 1e3, Wmm = s.W * 1e3;
    const maxW = Math.max(200, avail - 90), maxH = Math.min(380, Math.max(200, avail * 0.6));
    const k = Math.min(maxW / Lmm, maxH / Wmm);
    const padL = 44, padT = 34, padR = 44, padB = 44;
    const w = Lmm * k + padL + padR, h = Wmm * k + padT + padB;
    const svg = el('svg', { viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`, role: 'img',
      'aria-label': `Top view of ${fmtLen(s.L)} × ${fmtLen(s.W)} plate with ${s.layout} channel layout` }, container);

    const along = s.orient === 'length';
    const span = g.span;
    // (u, v) in metres → screen px
    const X = (u, v) => {
      if (s.mirror) v = span - v;
      const x = along ? u : v, y = along ? v : u;
      return [padL + x * 1e3 * k, padT + y * 1e3 * k];
    };
    const pts = (arr) => arr.map(([u, v]) => X(u, v).map((n) => n.toFixed(2)).join(',')).join(' ');

    el('rect', { x: padL, y: padT, width: Lmm * k, height: Wmm * k, rx: 3, class: 'plate' }, svg);

    const cold = cssColor('--cold'), hot = cssColor('--hot');
    const ok = res.ok && isFinite(res.Tout);
    const colorAt = (f) => (ok ? mix(cold, hot, f) : cssColor('--plate-edge'));
    const sw = Math.max(1.2, g.a * 1e3 * k);
    const m = s.margin;
    const ports = [];

    if (s.layout === 'serpentine') {
      const c = g.circuits, N = g.count, p = g.pitch;
      const u0 = m + c * p / 2, u1 = g.run - m - c * p / 2;
      const vpos = (pass, i) => m + ((pass % 2 === 0 ? i : c - 1 - i) + pass * c + 0.5) * p;
      const straightFrac = g.straight / g.Lch;
      const bendFrac = g.nBends ? (1 - N * straightFrac) / g.nBends : 0;
      const segs = 10;
      for (let i = 0; i < c; i++) {
        let f = 0;
        for (let pass = 0; pass < N; pass++) {
          const v = vpos(pass, i);
          const fwd = pass % 2 === 0;
          const ua = fwd ? u0 : u1, ub = fwd ? u1 : u0;
          for (let j = 0; j < segs; j++) {
            const a = ua + (ub - ua) * j / segs, b = ua + (ub - ua) * (j + 1) / segs;
            el('polyline', { points: pts([[a, v], [b, v]]), stroke: colorAt(f + straightFrac * (j + 0.5) / segs),
              'stroke-width': sw, fill: 'none', 'stroke-linecap': 'square' }, svg);
          }
          f += straightFrac;
          if (pass < N - 1) {
            const vn = vpos(pass + 1, i);
            const r = Math.abs(vn - v) / 2, vc = (v + vn) / 2, dir = fwd ? 1 : -1, sg = Math.sign(vn - v);
            const arc = [];
            for (let q = 0; q <= 16; q++) {
              const th = -Math.PI / 2 + Math.PI * q / 16;
              arc.push([ub + dir * r * Math.cos(th), vc + sg * r * Math.sin(th)]);
            }
            el('polyline', { points: pts(arc), stroke: colorAt(f + bendFrac / 2), 'stroke-width': sw, fill: 'none' }, svg);
            f += bendFrac;
          }
        }
      }
      // Ports with leads to each circuit's first and last pass.
      const uPort = (end) => (end ? g.run - Math.max(m / 2, s.portD / 2 + 0.001) : Math.max(m / 2, s.portD / 2 + 0.001));
      const vIn = [...Array(c).keys()].map((i) => vpos(0, i));
      const lastFwd = (N - 1) % 2 === 0;
      const vOut = [...Array(c).keys()].map((i) => vpos(N - 1, i));
      const pin = [uPort(false), vIn.reduce((a, b) => a + b) / c];
      const pout = [uPort(lastFwd), vOut.reduce((a, b) => a + b) / c];
      vIn.forEach((v) => el('polyline', { points: pts([pin, [pin[0], v], [u0, v]]), stroke: colorAt(0), 'stroke-width': sw, fill: 'none' }, svg));
      vOut.forEach((v) => el('polyline', { points: pts([pout, [pout[0], v], [lastFwd ? u1 : u0, v]]), stroke: colorAt(1), 'stroke-width': sw, fill: 'none' }, svg));
      ports.push({ uv: pin, label: 'IN', color: cold }, { uv: pout, label: 'OUT', color: hot });
    } else {
      const hw = s.header, p = g.pitch;
      const uA = m + hw, uB = g.run - m - hw;
      el('polygon', { points: pts([[m, m], [uA, m], [uA, span - m], [m, span - m]]), fill: colorAt(0), class: 'header-rect' }, svg);
      el('polygon', { points: pts([[uB, m], [g.run - m, m], [g.run - m, span - m], [uB, span - m]]), fill: colorAt(1), class: 'header-rect' }, svg);
      const segs = 12;
      for (let i = 0; i < g.count; i++) {
        const v = m + (i + 0.5) * p;
        for (let j = 0; j < segs; j++) {
          const a = uA + (uB - uA) * j / segs, b = uA + (uB - uA) * (j + 1) / segs;
          el('polyline', { points: pts([[a, v], [b, v]]), stroke: colorAt((j + 0.5) / segs), 'stroke-width': sw, fill: 'none' }, svg);
        }
      }
      const r = s.portD / 2;
      const vStart = m + Math.max(r, 0.002), vEnd = span - m - Math.max(r, 0.002);
      ports.push({ uv: [m + hw / 2, vStart], label: 'IN', color: cold });
      ports.push({ uv: [g.run - m - hw / 2, s.layout === 'parallelZ' ? vEnd : vStart], label: 'OUT', color: hot });
    }

    // Port symbols with a label outside the nearest plate edge.
    const x0 = padL, y0 = padT, x1 = padL + Lmm * k, y1 = padT + Wmm * k;
    for (const pt of ports) {
      const [x, y] = X(pt.uv[0], pt.uv[1]);
      const d = [[x - x0, -1, 0], [x1 - x, 1, 0], [y - y0, 0, -1], [y1 - y, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      const ex = d[1] ? (d[1] < 0 ? x0 - 14 : x1 + 14) : x;
      const ey = d[2] ? (d[2] < 0 ? y0 - 14 : y1 + 14) : y;
      el('line', { x1: x, y1: y, x2: ex, y2: ey, stroke: pt.color, 'stroke-width': 2, 'stroke-dasharray': '3 2' }, svg);
      el('circle', { cx: x, cy: y, r: Math.max(4, s.portD * 1e3 * k / 2), class: 'port', stroke: pt.color }, svg);
      const anchor = d[1] < 0 ? 'end' : d[1] > 0 ? 'start' : 'middle';
      const tx = ex + (d[1] < 0 ? -3 : d[1] > 0 ? 3 : 0);
      const ty = ey + (d[2] < 0 ? -3 : d[2] > 0 ? 11 : 4);
      text(svg, tx, ty, pt.label, { class: 'port-label', 'text-anchor': anchor, fill: pt.color });
    }

    dimLine(svg, x0, y1 + 22, x1, y1 + 22, 'L ' + fmtLen(s.L), false);
    dimLine(svg, x0 - 22, y0, x0 - 22, y1, 'W ' + fmtLen(s.W), true);

    // Heat sources (draggable in the app).
    const view = { k, padL, padT };
    if (s.heatArea === 'sources') drawSources(svg, s, view, true);
    return view;
  }

  /** Source rectangles in plate coordinates (x along length, y along width, centre). */
  function drawSources(svg, s, view, editable, results) {
    const { k, padL, padT } = view;
    (s.sources || []).forEach((src, i) => {
      const x = padL + (src.x - src.w / 2) * 1e3 * k, y = padT + (src.y - src.h / 2) * 1e3 * k;
      const w = src.w * 1e3 * k, h = src.h * 1e3 * k;
      const g = el('g', { class: 'src-shape' + (editable ? ' draggable' : ''), 'data-i': i }, svg);
      el('rect', { x, y, width: w, height: h, rx: 2, class: results ? 'src-outline' : 'src-rect' }, g);
      const r = results && results[i];
      const lines = r ? [src.name, 'Tj ' + Units.format('temp', r.Tj, { digits: 0 })] : [src.name, Units.fmtNumber(src.P, 0) + ' W'];
      const maxLen = Math.max(...lines.map((l) => l.length));
      const fs = Math.min(12, h / 3.2, (w - 6) / (maxLen * 0.6 + 1.2));
      if (fs < 6.5) return; // too small to label legibly; the table and tooltip carry the values
      if (r) {
        // On the map, labels sit on a solid tag so they stay legible over any colour.
        const tw = maxLen * fs * 0.6 + 8, thh = lines.length * (fs + 2) + 5;
        el('rect', { x: x + w / 2 - tw / 2, y: y + h / 2 - thh / 2, width: tw, height: thh, rx: 3, class: 'src-tag' }, g);
      }
      lines.forEach((ln, li) => {
        text(g, x + w / 2, y + h / 2 + (li - (lines.length - 1) / 2) * (fs + 2) + fs / 3, ln,
          { class: 'src-label' + (li ? ' sub' : '') + (r ? ' plain' : ''), 'text-anchor': 'middle', 'font-size': fs });
      });
    });
  }

  // Sequential warm ramp (light → dark) for plate temperature.
  const RAMP = ['#fdeeb1', '#fcc66b', '#f69240', '#e35a2a', '#b8282a', '#7a1424'];
  function rampColor(f) {
    f = Math.min(1, Math.max(0, f));
    const p = f * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(p));
    return hexToRgb(RAMP[i]).map((c, j) => Math.round(c + (hexToRgb(RAMP[i + 1])[j] - c) * (p - i)));
  }

  /** Plate temperature map with channel outlines, source labels and the hottest point. */
  function drawMap(container, s, res, map) {
    const avail = container.clientWidth || 760;
    container.textContent = '';
    const g = res.geometry;
    const Lmm = s.L * 1e3, Wmm = s.W * 1e3;
    const k = Math.min(Math.max(200, avail - 40) / Lmm, Math.min(380, Math.max(200, avail * 0.6)) / Wmm);
    const padL = 14, padT = 14;
    const w = Lmm * k + 2 * padL, h = Wmm * k + 2 * padT;
    const svg = el('svg', { viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`, role: 'img',
      'aria-label': `Plate temperature map, ${Units.format('temp', map.Tmin)} to ${Units.format('temp', map.Tmax)}` }, container);

    const { nx, ny } = map.grid;
    const c = document.createElement('canvas');
    c.width = nx; c.height = ny;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(nx, ny);
    const span = Math.max(1e-6, map.Tmax - map.Tmin);
    for (let kk = 0; kk < nx * ny; kk++) {
      const [r, gg, b] = rampColor((map.T[kk] - map.Tmin) / span);
      img.data.set([r, gg, b, 255], kk * 4);
    }
    ctx.putImageData(img, 0, 0);
    el('image', { href: c.toDataURL('image/png'), x: padL, y: padT, width: Lmm * k, height: Wmm * k, preserveAspectRatio: 'none' }, svg);
    el('rect', { x: padL, y: padT, width: Lmm * k, height: Wmm * k, class: 'map-frame' }, svg);

    const P = (x, y) => `${(padL + x * 1e3 * k).toFixed(1)},${(padT + y * 1e3 * k).toFixed(1)}`;
    for (const path of Physics2D.channelPaths(s, g)) {
      el('polyline', { points: path.pts.map(([x, y]) => P(x, y)).join(' '), class: 'map-channel', 'stroke-width': Math.max(1, g.a * 1e3 * k) }, svg);
    }
    if (s.heatArea === 'sources') drawSources(svg, s, { k, padL, padT }, false, map.sources);

    const hx = padL + map.hottest.x * 1e3 * k, hy = padT + map.hottest.y * 1e3 * k;
    el('circle', { cx: hx, cy: hy, r: 6, class: 'hot-mark' }, svg);
    el('circle', { cx: hx, cy: hy, r: 1.5, class: 'hot-dot' }, svg);
    return { k, padL, padT, svg };
  }

  /** Colour bar for the map legend. */
  function mapLegend(container, map) {
    container.textContent = '';
    const lo = document.createElement('span'); lo.textContent = Units.format('temp', map.Tmin);
    const bar = document.createElement('span'); bar.className = 'ramp';
    bar.style.background = `linear-gradient(90deg, ${RAMP.join(', ')})`;
    const hi = document.createElement('span'); hi.textContent = Units.format('temp', map.Tmax);
    const mark = document.createElement('span'); mark.className = 'hot-key'; mark.textContent = '◯ hottest point';
    container.append(lo, bar, hi, mark);
  }

  function drawSection(container, s, res) {
    const avail = container.clientWidth || 760;
    container.textContent = '';
    const g = res.geometry;
    const runs = Math.min(g.nRuns, 3);
    const winM = Math.min(g.span, s.margin + runs * g.pitch + Math.min(g.pitch * 0.4, s.margin));
    const maxW = Math.max(160, avail - 190);
    const k = Math.min(maxW / (winM * 1e3), 110 / (s.t * 1e3));
    const padL = 60, padT = 30, padR = 120, padB = 14;
    const W = winM * 1e3 * k, H = s.t * 1e3 * k;
    const svg = el('svg', { viewBox: `0 0 ${W + padL + padR} ${H + padT + padB}`, role: 'img',
      'aria-label': 'Cross-section through the plate showing channel size and wall thicknesses' }, container);
    const X = (v) => padL + v * 1e3 * k, Y = (z) => padT + z * 1e3 * k;

    // Plate with a break line at the right.
    const zig = [];
    for (let i = 0; i <= 6; i++) zig.push(`${X(winM) + (i % 2 ? 5 : -2)},${Y(s.t * i / 6)}`);
    el('polygon', { points: `${X(0)},${Y(0)} ${X(winM) - 2},${Y(0)} ${zig.join(' ')} ${X(0)},${Y(s.t)}`, class: 'plate' }, svg);

    // Heat arrows on the heated face.
    const nA = 7;
    for (let i = 0; i < nA; i++) {
      const x = X(winM * (i + 0.5) / nA);
      el('line', { x1: x, y1: padT - 22, x2: x, y2: padT - 6, class: 'heat-arrow' }, svg);
      el('path', { d: `M${x - 3.5} ${padT - 8} L${x + 3.5} ${padT - 8} L${x} ${padT - 2} Z`, class: 'heat-head' }, svg);
    }
    text(svg, padL - 8, padT - 10, 'Heat', { class: 'dim-text', 'text-anchor': 'end' });

    for (let j = 0; j < runs; j++) {
      const vc = s.margin + (j + 0.5) * g.pitch;
      if (s.shape === 'round') el('circle', { cx: X(vc), cy: Y(s.wallHeated + g.b / 2), r: g.a / 2 * 1e3 * k, class: 'channel-cut' }, svg);
      else el('rect', { x: X(vc - g.a / 2), y: Y(s.wallHeated), width: g.a * 1e3 * k, height: g.b * 1e3 * k, class: 'channel-cut' }, svg);
    }

    // Annotations on the right.
    const ax = X(winM) + 16;
    const ann = (z0, z1, label) => {
      el('line', { x1: ax, y1: Y(z0), x2: ax, y2: Y(z1), class: 'dim' }, svg);
      el('line', { x1: ax - 3, y1: Y(z0), x2: ax + 3, y2: Y(z0), class: 'dim' }, svg);
      el('line', { x1: ax - 3, y1: Y(z1), x2: ax + 3, y2: Y(z1), class: 'dim' }, svg);
      text(svg, ax + 7, (Y(z0) + Y(z1)) / 2 + 4, label, { class: 'dim-text' });
    };
    if (s.wallHeated * 1e3 * k > 6) ann(0, s.wallHeated, 'wall ' + fmtLen(s.wallHeated));
    if (g.b * 1e3 * k > 6) ann(s.wallHeated, s.wallHeated + g.b, (s.shape === 'round' ? 'Ø ' : 'depth ') + fmtLen(g.b));
    if (g.backWall * 1e3 * k > 6) ann(s.wallHeated + g.b, s.t, 'back ' + fmtLen(g.backWall));

    // Pitch and thickness.
    if (runs >= 2) {
      const v1 = s.margin + 0.5 * g.pitch, v2 = v1 + g.pitch;
      const y = Y(s.t) + 0.5;
      el('line', { x1: X(v1), y1: y, x2: X(v2), y2: y, class: 'dim' }, svg);
      text(svg, (X(v1) + X(v2)) / 2, y - 4, 'pitch ' + fmtLen(g.pitch), { class: 'dim-text', 'text-anchor': 'middle' });
    }
    text(svg, padL - 8, Y(s.t / 2) + 4, 't ' + fmtLen(s.t), { class: 'dim-text', 'text-anchor': 'end' });
  }

  root.Drawing = { drawTop, drawSection, drawMap, mapLegend, rampColor, mix, cssColor };
})(window);
