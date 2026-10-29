/*
 * Minimal single-series SVG line chart with crosshair tooltip and an
 * operating-point marker.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
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

  /**
   * @param container element
   * @param o { data: [{x, y}], op: {x, y}, xTitle, yTitle, fmtX(v), fmtY(v), opLabel }
   */
  function lineChart(container, o) {
    const W = Math.max(260, container.clientWidth || 420), H = 230;
    container.textContent = '';
    const m = { l: 48, r: 14, t: 14, b: 38 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const data = o.data.filter((d) => isFinite(d.x) && isFinite(d.y));
    if (data.length < 2) { container.textContent = 'Not enough valid points to plot.'; return; }
    const xMax = Math.max(...data.map((d) => d.x));
    const yTicks = niceTicks(Math.max(...data.map((d) => d.y), o.op ? o.op.y : 0));
    const yMax = yTicks[yTicks.length - 1];
    const xTicks = niceTicks(xMax, 5).filter((t) => t <= xMax * 1.0001);
    const sx = (x) => m.l + (x / xMax) * iw;
    const sy = (y) => m.t + ih - (y / yMax) * ih;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${o.yTitle} versus ${o.xTitle}` }, container);
    const ax = el('g', { class: 'axis' }, svg);
    yTicks.forEach((t) => {
      el('line', { x1: m.l, x2: m.l + iw, y1: sy(t), y2: sy(t), class: t === 0 ? 'baseline' : 'gridline' }, ax);
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

    const d = data.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    el('path', { d: `${d}L${sx(data[data.length - 1].x)},${sy(0)}L${sx(data[0].x)},${sy(0)}Z`, class: 'area' }, svg);
    el('path', { d, class: 'line' }, svg);

    if (o.op && isFinite(o.op.y)) {
      el('circle', { cx: sx(o.op.x), cy: sy(o.op.y), r: 5, class: 'op' }, svg);
      const left = sx(o.op.x) > m.l + iw * 0.6;
      const lt = el('text', { x: sx(o.op.x) + (left ? -9 : 9), y: sy(o.op.y) - 8, 'text-anchor': left ? 'end' : 'start', class: 'op-label' }, svg);
      lt.textContent = o.opLabel || 'Current';
    }

    // Crosshair + tooltip.
    const cross = el('line', { y1: m.t, y2: m.t + ih, class: 'cross', visibility: 'hidden' }, svg);
    const dot = el('circle', { r: 4, class: 'hover-dot', visibility: 'hidden' }, svg);
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    container.appendChild(tip);
    const hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);

    function show(evt) {
      const r = svg.getBoundingClientRect();
      const px = (evt.clientX - r.left) * (W / r.width);
      let best = data[0];
      for (const p of data) if (Math.abs(sx(p.x) - px) < Math.abs(sx(best.x) - px)) best = p;
      const cx = sx(best.x), cy = sy(best.y);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('visibility', 'visible');
      tip.textContent = '';
      const b = document.createElement('b'); b.textContent = o.fmtYFull(best.y); tip.appendChild(b);
      const s = document.createElement('div'); s.className = 'muted'; s.textContent = 'at ' + o.fmtXFull(best.x); tip.appendChild(s);
      tip.hidden = false;
      const scale = r.width / W;
      let left = cx * scale + 12;
      if (left + tip.offsetWidth > r.width) left = cx * scale - tip.offsetWidth - 12;
      tip.style.left = left + 'px';
      tip.style.top = Math.max(0, cy * scale - tip.offsetHeight - 8) + 'px';
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);
  }

  root.Charts = { lineChart };
})(window);
