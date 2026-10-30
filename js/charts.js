/*
 * Minimal SVG line chart: one or more series on a shared y-axis, crosshair
 * tooltip, optional operating-point marker. Multi-series charts get a legend
 * and direct end labels.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const t = (s, p) => (root.I18N ? root.I18N.t(s, p) : s);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  function niceTicks(max, n = 4) {
    if (!(max > 0)) return [0, 1];
    const raw = max / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(+v.toPrecision(10));
    if (ticks[ticks.length - 1] < max) ticks.push(+(ticks[ticks.length - 1] + step).toPrecision(10));
    return ticks;
  }

  /** Nice ticks spanning [min, max] (for axes that do not start at zero). */
  function niceRange(min, max, n = 4) {
    if (!(max > min)) { const d = Math.abs(min) * 0.05 || 1; min -= d; max += d; }
    const raw = (max - min) / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let v = Math.floor(min / step + 1e-9) * step; v < max + step * 0.999; v += step) ticks.push(+v.toPrecision(10));
    return ticks;
  }

  /**
   * @param container element
   * @param o { data: [{x, y}] | series: [{name, data}], op: {x, y}, opLabel,
   *            xTitle, yTitle, fmtX, fmtY, fmtXFull, fmtYFull, yMaxHint,
   *            xFrom / yFrom: 'data' to start the axis at the data instead of zero }
   */
  function lineChart(container, o) {
    const W = Math.max(260, container.clientWidth || 420), H = 230;
    container.textContent = '';
    const multi = !!o.series;
    const series = (o.series || [{ name: o.yTitle, data: o.data }])
      .map((s, i) => Object.assign({}, s, { slot: i + 1, data: s.data.filter((d) => isFinite(d.x) && isFinite(d.y)) }))
      .filter((s) => s.data.length >= 2);
    if (!series.length) { container.textContent = t('Not enough valid points to plot.'); return; }

    if (multi) {
      const lg = document.createElement('div');
      lg.className = 'chart-legend';
      series.forEach((s) => {
        const it = document.createElement('span');
        const key = document.createElement('i'); key.className = `key s${s.slot}`;
        it.append(key, document.createTextNode(s.name));
        lg.appendChild(it);
      });
      container.appendChild(lg);
    }

    const m = { l: 48, r: multi ? 64 : 14, t: 14, b: 38 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const all = series.flatMap((s) => s.data);
    const xMax = Math.max(...all.map((d) => d.x));
    const x0 = o.xFrom === 'data' ? Math.min(...all.map((d) => d.x)) : 0;
    const ys = all.map((d) => d.y).concat(o.op && isFinite(o.op.y) ? [o.op.y] : []);
    const yTicks = o.yFrom === 'data' ? niceRange(Math.min(...ys), Math.max(...ys)) : niceTicks(o.yMaxHint || Math.max(...ys, 0));
    const y0 = yTicks[0], yMax = yTicks[yTicks.length - 1];
    const xTicks = (x0 ? niceRange(x0, xMax, 5) : niceTicks(xMax, 5)).filter((t) => t >= x0 - (xMax - x0) * 1e-4 && t <= xMax + (xMax - x0) * 1e-4);
    const sx = (x) => m.l + ((x - x0) / (xMax - x0 || 1)) * iw;
    const sy = (y) => m.t + ih - ((Math.min(y, yMax + (yMax - y0) * 0.05) - y0) / (yMax - y0)) * ih;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${o.yTitle} versus ${o.xTitle}` }, container);
    const ax = el('g', { class: 'axis' }, svg);
    yTicks.forEach((t) => {
      el('line', { x1: m.l, x2: m.l + iw, y1: sy(t), y2: sy(t), class: t === y0 ? 'baseline' : 'gridline' }, ax);
      const tx = el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, ax);
      tx.textContent = o.fmtY(t);
    });
    xTicks.forEach((t) => {
      const tx = el('text', { x: sx(t), y: m.t + ih + 16, 'text-anchor': 'middle' }, ax);
      tx.textContent = o.fmtX(t);
    });
    const xt = el('text', { x: m.l + iw / 2, y: H - 4, 'text-anchor': 'middle', class: 'axis-title' }, svg);
    xt.textContent = o.xTitle;
    const yt = el('text', { x: 12, y: m.t + ih / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 12 ${m.t + ih / 2})` }, svg);
    yt.textContent = o.yTitle;

    // Clip lines that run above the axis (e.g. a steep system curve).
    const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = el('defs', {}, svg);
    const cp = el('clipPath', { id: clipId }, defs);
    el('rect', { x: m.l, y: m.t - 2, width: iw + 2, height: ih + 4 }, cp);

    const labels = [];
    series.forEach((s) => {
      const d = s.data.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
      if (!multi) el('path', { d: `${d}L${sx(s.data[s.data.length - 1].x)},${sy(y0)}L${sx(s.data[0].x)},${sy(y0)}Z`, class: 'area' }, svg);
      el('path', { d, class: `line s${s.slot}`, 'clip-path': `url(#${clipId})` }, svg);
      if (multi) {
        // Direct label at the last point inside the plot.
        const last = s.data.filter((p) => p.y <= yMax).pop() || s.data[s.data.length - 1];
        labels.push({ x: Math.min(sx(last.x), m.l + iw) + 6, y: sy(last.y) + 4, text: s.short || s.name });
      }
    });
    // Nudge end labels apart so they never overlap.
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) {
      const prev = labels[i - 1], cur = labels[i];
      if (Math.abs(cur.x - prev.x) < 60 && cur.y - prev.y < 13) cur.y = prev.y + 13;
    }
    labels.forEach((lb) => { const t = el('text', { x: lb.x, y: lb.y, class: 'series-label' }, svg); t.textContent = lb.text; });

    if (o.op && isFinite(o.op.y)) {
      el('circle', { cx: sx(o.op.x), cy: sy(o.op.y), r: 5, class: 'op' }, svg);
      const left = sx(o.op.x) > m.l + iw * 0.6;
      const lt = el('text', { x: sx(o.op.x) + (left ? -9 : 9), y: sy(o.op.y) - 8, 'text-anchor': left ? 'end' : 'start', class: 'op-label' }, svg);
      lt.textContent = o.opLabel || 'Current';
    }

    // Crosshair + tooltip.
    const cross = el('line', { y1: m.t, y2: m.t + ih, class: 'cross', visibility: 'hidden' }, svg);
    const dots = series.map((s) => el('circle', { r: 4, class: `hover-dot s${s.slot}`, visibility: 'hidden' }, svg));
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    container.appendChild(tip);
    const hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
    const nearest = (data, px) => data.reduce((b, p) => (Math.abs(sx(p.x) - px) < Math.abs(sx(b.x) - px) ? p : b), data[0]);

    function show(evt) {
      const r = svg.getBoundingClientRect();
      const px = (evt.clientX - r.left) * (W / r.width);
      const ref = nearest(series[0].data, px);
      const cx = sx(ref.x);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      tip.textContent = '';
      let topY = Infinity;
      series.forEach((s, i) => {
        const p = nearest(s.data, cx);
        dots[i].setAttribute('cx', sx(p.x)); dots[i].setAttribute('cy', sy(p.y)); dots[i].setAttribute('visibility', 'visible');
        topY = Math.min(topY, sy(p.y));
        const row = document.createElement('div');
        if (multi) { const k = document.createElement('i'); k.className = `key s${s.slot}`; row.appendChild(k); }
        const b = document.createElement('b'); b.textContent = o.fmtYFull(p.y); row.appendChild(b);
        if (multi) row.appendChild(document.createTextNode(' ' + (s.short || s.name)));
        tip.appendChild(row);
      });
      const sub = document.createElement('div'); sub.className = 'muted'; sub.textContent = t('at {x}', { x: o.fmtXFull(ref.x) }); tip.appendChild(sub);
      tip.hidden = false;
      const scale = r.width / W;
      const offTop = container.querySelector('.chart-legend') ? container.querySelector('.chart-legend').offsetHeight : 0;
      let left = cx * scale + 12;
      if (left + tip.offsetWidth > r.width) left = cx * scale - tip.offsetWidth - 12;
      tip.style.left = left + 'px';
      tip.style.top = Math.max(0, offTop + topY * scale - tip.offsetHeight - 8) + 'px';
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); tip.hidden = true; }
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);
  }

  /**
   * Vertical bars with a dashed reference line and per-bar tooltips.
   * @param o { values: [number], ref, refLabel, yTitle, xTitle, fmtY(v), tip(i) → [strong, sub] }
   */
  function barChart(container, o) {
    const W = Math.max(260, container.clientWidth || 420), H = 220;
    container.textContent = '';
    const m = { l: 48, r: 14, t: 14, b: 38 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const n = o.values.length;
    const yTicks = niceTicks(Math.max(...o.values, o.ref * 1.15));
    const yMax = yTicks[yTicks.length - 1];
    const sy = (y) => m.t + ih - (y / yMax) * ih;
    const slot = iw / n, bw = Math.max(1, Math.min(28, slot - 2));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${o.yTitle} for each of ${n} channels` }, container);
    const ax = el('g', { class: 'axis' }, svg);
    yTicks.forEach((t) => {
      el('line', { x1: m.l, x2: m.l + iw, y1: sy(t), y2: sy(t), class: t === 0 ? 'baseline' : 'gridline' }, ax);
      const tx = el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, ax);
      tx.textContent = o.fmtY(t);
    });
    const step = Math.ceil(n / Math.max(1, Math.floor(iw / 28)));
    for (let i = 0; i < n; i += step) {
      const tx = el('text', { x: m.l + slot * (i + 0.5), y: m.t + ih + 16, 'text-anchor': 'middle' }, ax);
      tx.textContent = String(i + 1);
    }
    const xt = el('text', { x: m.l + iw / 2, y: H - 4, 'text-anchor': 'middle', class: 'axis-title' }, svg);
    xt.textContent = o.xTitle;
    const yt = el('text', { x: 12, y: m.t + ih / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 12 ${m.t + ih / 2})` }, svg);
    yt.textContent = o.yTitle;

    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    container.appendChild(tip);
    o.values.forEach((v, i) => {
      const x = m.l + slot * (i + 0.5) - bw / 2, y = sy(v), y0 = sy(0), r = Math.min(4, bw / 2, y0 - y);
      // Rounded data end, square at the baseline.
      el('path', { d: `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${y0}Z`, class: 'bar' }, svg);
      const hit = el('rect', { x: m.l + slot * i, y: m.t, width: slot, height: ih, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', () => {
        const [strong, sub] = o.tip(i);
        tip.textContent = '';
        const b = document.createElement('b'); b.textContent = strong;
        const s = document.createElement('div'); s.className = 'muted'; s.textContent = sub;
        tip.append(b, s);
        tip.hidden = false;
        const rr = svg.getBoundingClientRect(), sc = rr.width / W;
        let left = (x + bw + 8) * sc;
        if (left + tip.offsetWidth > rr.width) left = (x - 8) * sc - tip.offsetWidth;
        tip.style.left = left + 'px';
        tip.style.top = Math.max(0, y * sc - tip.offsetHeight - 6) + 'px';
      });
      hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    });
    el('line', { x1: m.l, x2: m.l + iw, y1: sy(o.ref), y2: sy(o.ref), class: 'ref-line' }, svg);
    const rl = el('text', { x: m.l + 4, y: sy(o.ref) - 5, 'text-anchor': 'start', class: 'op-label' }, svg);
    rl.textContent = o.refLabel;
  }

  root.Charts = { lineChart, barChart };
})(window);
