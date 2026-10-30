/*
 * Design studies: side-by-side comparison of saved design variants and
 * one-parameter sweeps. The calculation part (evaluate, metrics, sweep
 * values) also runs in Node for the tests; the UI part needs a browser.
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const Physics = isNode ? require('./physics.js') : root.Physics;
  const Physics2D = isNode ? require('./physics2d.js') : root.Physics2D;
  const Data = isNode ? require('./data.js') : root.CPData;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const serp = (s) => s.layout === 'serpentine';

  // ---------- Calculation (Node and browser) ----------

  /** Inputs that can be swept. q: unit quantity ('flow' = the state's flow unit, 'int', 'factor'). */
  const PARAMS = [
    { key: 'flow', label: 'Flow rate', q: 'flow', when: (s) => s.flowSource !== 'pump' },
    { key: 'count', label: (s) => (serp(s) ? 'Passes' : 'Channels'), q: 'int' },
    { key: 'circuits', label: 'Parallel circuits', q: 'int', when: serp },
    { key: 'D', label: 'Channel diameter', q: 'length', when: (s) => s.shape === 'round' },
    { key: 'cw', label: 'Channel width', q: 'length', when: (s) => s.shape !== 'round' },
    { key: 'cd', label: 'Channel depth', q: 'length', when: (s) => s.shape === 'rect' },
    { key: 't', label: 'Plate thickness', q: 'length' },
    { key: 'wallHeated', label: 'Wall to heated face', q: 'length' },
    { key: 'margin', label: 'Edge margin', q: 'length' },
    { key: 'header', label: 'Header width', q: 'length', when: (s) => !serp(s) },
    { key: 'headerDepth', label: 'Header depth', q: 'length', when: (s) => !serp(s) },
    { key: 'portD', label: 'Port inner Ø', q: 'length' },
    { key: 'Tin', label: 'Inlet temperature', q: 'temp' },
    { key: 'pIn', label: 'Inlet pressure', q: 'pressure', when: (s) => Data.FLUIDS[s.fluid].phase === 'gas' },
    { key: 'Q', label: 'Heat load', q: 'power', when: (s) => s.heatArea !== 'sources' && s.mode !== 'capacity' },
    { key: 'TsMax', label: 'Max. surface temp.', q: 'temp', when: (s) => s.heatArea !== 'sources' && s.mode === 'capacity' },
    { key: 'pscale', label: 'Power of all sources', q: 'factor', when: (s) => s.heatArea === 'sources' && (s.sources || []).length > 0 },
  ];
  const paramsFor = (s) => PARAMS.filter((p) => !p.when || p.when(s));
  const paramLabel = (p, s) => (typeof p.label === 'function' ? p.label(s) : p.label);

  /** Current SI value of a sweep parameter. */
  function paramValue(s, key) {
    if (key === 'pscale') return 1;
    if (key === 'headerDepth') return s.headerDepth > 0 ? s.headerDepth : (s.shape === 'rect' ? s.cd : s.shape === 'round' ? s.D : s.cw);
    return s[key];
  }

  /** Copy of the state with one parameter set (pscale multiplies every source's power). */
  function applyParam(s, key, v) {
    const n = clone(s);
    const p = PARAMS.find((x) => x.key === key);
    if (key === 'pscale') n.sources.forEach((src) => { src.P *= v; });
    else n[key] = p && p.q === 'int' ? Math.max(1, Math.round(v)) : v;
    return n;
  }

  /** n evenly spaced values from..to (rounded for integers), plus the current value when inside the range. */
  function sweepValues(from, to, n, isInt, current) {
    const lo = Math.min(from, to), hi = Math.max(from, to);
    const vals = [];
    for (let i = 0; i < n; i++) vals.push(lo + (hi - lo) * (n > 1 ? i / (n - 1) : 0));
    if (current >= lo && current <= hi) vals.push(current);
    const out = [];
    for (const v of (isInt ? vals.map((x) => Math.max(1, Math.round(x))) : vals).sort((a, b) => a - b)) {
      if (!out.length || Math.abs(v - out[out.length - 1]) > 1e-9 * Math.max(1, Math.abs(v))) out.push(v);
    }
    return out;
  }

  /** Full evaluation of a design: pump operating point, 1D hydraulics and the 2D plate model. */
  function evaluateDesign(s, opts = {}) {
    try {
      const eff = Physics.effectiveState(s, {});
      const ev = Physics2D.evaluate(eff.s, { maxCells: opts.maxCells });
      const map = s.heatArea === 'sources' && !(s.sources || []).length ? null : ev.map;
      return { s: eff.s, op: eff.op, res: ev.base, map };
    } catch (e) {
      return { s, op: null, res: { ok: false }, map: null };
    }
  }

  /** Key numbers of an evaluated design (SI). headline is what the design is judged by. */
  function metrics(d) {
    const { s, res, map } = d;
    if (!res || !res.ok) return { ok: false };
    const kind = s.heatArea === 'sources' ? 'tj' : s.mode === 'capacity' ? 'q' : 'tmax';
    if (kind === 'tj' && !map) return { ok: false };
    const srcs = kind === 'tj' ? map.sources : [];
    const m = {
      ok: true, kind,
      Q: map ? map.Qtotal : res.Q,
      Tpeak: map ? map.Tmax : res.TsMax,
      Tj: srcs.length ? Math.max(...srcs.map((r) => r.Tj)) : null,
      margin: srcs.length ? Math.min(...srcs.map((r) => r.margin)) : null,
      headroom: srcs.length ? map.headroom : null,
      Tout: map ? map.Tout : res.Tout,
      dp: res.dp, pumpPower: res.pumpPower, flow: res.volFlow, v: res.v, Re: res.Re, h: res.h,
      flowMin: res.dist ? res.dist.min : null,
      spread: map ? map.Tmax - map.Tmin : null,
      mass: res.plateMass, fluidVol: res.fluidVol,
    };
    m.headline = kind === 'tj' ? m.Tj : kind === 'q' ? m.Q : m.Tpeak;
    return m;
  }

  /** CSV text: values containing separators or quotes are quoted. */
  function toCsv(rows) {
    const cell = (v) => {
      const x = v === null || v === undefined ? '' : String(v);
      return /[",\n;]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    };
    return rows.map((r) => r.map(cell).join(',')).join('\r\n');
  }

  const Study = { PARAMS, paramsFor, paramLabel, paramValue, applyParam, sweepValues, evaluateDesign, metrics, toCsv };

  if (isNode) { module.exports = Study; return; }

  // ---------- Browser UI ----------

  const MAX_SNAPS = 4;
  const STORE = 'coldplate.compare';
  const LETTERS = 'ABCDEFGH';

  /**
   * ctx: { t, fmtPower, toast, current() → { state, app, s, res, map, op }, load(state, app), flowQty(state) }
   */
  function init(ctx) {
    const t = ctx.t;
    const $ = (id) => document.getElementById(id);
    const U = root.Units;
    const fmt = (q, v, o) => U.format(q, v, o);
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

    // Display quantity of a parameter for a given state.
    const dq = (p, s) => (p.q === 'flow' ? ctx.flowQty(s) : p.q);
    const toD = (p, s, si) => (p.q === 'int' || p.q === 'factor' ? si : U.toDisplay(dq(p, s), si));
    const fromD = (p, s, d) => (p.q === 'int' || p.q === 'factor' ? d : U.fromDisplay(dq(p, s), d));
    const unitOf = (p, s) => (p.q === 'int' ? '' : p.q === 'factor' ? '×' : U.label(dq(p, s)));
    const fmtParam = (p, s, si) => (p.q === 'int' ? String(Math.round(si)) : p.q === 'factor' ? `×${U.fmtNumber(si, 2)}` : fmt(dq(p, s), si));

    function download(name, text) {
      const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }
    const stamp = () => new Date().toISOString().slice(0, 10);
    const num = (v) => (v === null || v === undefined || !isFinite(v) ? '' : +v.toPrecision(5));

    // ===== Design comparison =====

    let snaps = [];
    try { snaps = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { snaps = []; }
    if (!Array.isArray(snaps)) snaps = [];
    const saveSnaps = () => { try { localStorage.setItem(STORE, JSON.stringify(snaps)); } catch (e) { /* storage unavailable */ } };
    const cache = new Map(); // JSON of state → evaluated design + metrics

    function evalCached(s) {
      const key = JSON.stringify(s);
      if (!cache.has(key)) {
        if (cache.size > 24) cache.delete(cache.keys().next().value);
        const d = evaluateDesign(s);
        cache.set(key, { d, m: metrics(d) });
      }
      return cache.get(key);
    }

    function addSnapshot() {
      if (snaps.length >= MAX_SNAPS) { ctx.toast(t('Up to {n} designs can be compared — remove one first.', { n: MAX_SNAPS })); return; }
      const cur = ctx.current();
      const used = new Set(snaps.map((x) => x.name));
      const letter = [...LETTERS].find((c) => !used.has(t('Design {x}', { x: c }))) || String(snaps.length + 1);
      snaps.push({ name: t('Design {x}', { x: letter }), s: clone(cur.state), app: cur.app });
      saveSnaps();
      render();
      ctx.toast(t('Added to the comparison'));
    }

    /** Input summary rows [label, text] for a design. */
    function describe(s, app) {
      const L = (v) => fmt('length', v, { noUnit: true });
      const mat = Data.MATERIALS[s.material];
      const section = s.shape === 'round' ? `Ø ${fmt('length', s.D)}`
        : s.shape === 'square' ? `${L(s.cw)} × ${fmt('length', s.cw)}` : `${L(s.cw)} × ${fmt('length', s.cd)}`;
      const layout = { serpentine: 'Serpentine', parallelZ: 'Parallel · Z', parallelU: 'Parallel · U' }[s.layout];
      const channels = serp(s)
        ? t('{n} passes × {c} circuits', { n: Math.round(s.count), c: Math.max(1, Math.round(s.circuits)) })
        : t('{n} channels', { n: Math.round(s.count) });
      let heat;
      if (s.heatArea === 'sources') heat = t('Heat sources: {n} · {P}', { n: (s.sources || []).length, P: ctx.fmtPower((s.sources || []).reduce((a, x) => a + x.P, 0)) });
      else if (s.mode === 'capacity') heat = t('Uniform, max. surface {T}', { T: fmt('temp', s.TsMax) });
      else heat = t('Uniform, {P}', { P: ctx.fmtPower(s.Q) });
      const flowTxt = s.flowSource === 'pump' ? t('Pump curve') : fmt(ctx.flowQty(s), s.flow);
      return [
        ['Application', app ? t(app) : '—'],
        ['Plate', `${L(s.L)} × ${L(s.W)} × ${fmt('length', s.t)}`],
        ['Material', s.material === 'custom' ? t('Custom') : t(mat.name)],
        ['Flow layout', t(layout)],
        ['Channels', `${channels} · ${section}`],
        ['Coolant', t(Data.FLUIDS[s.fluid].name)],
        ['Inlet temperature', fmt('temp', s.Tin)],
        ['Flow', flowTxt],
        ['Heat input', heat],
      ];
    }

    /** Result rows: label, getter, display formatter, CSV quantity and which direction is better. */
    function resultRows() {
      const pw = (v) => (U.system === 'SI' ? fmt('power', v, { digits: 2 }) : fmt('power2', v, { digits: 4 }));
      return [
        { label: 'Total heat', get: (m) => m.Q, f: (v) => ctx.fmtPower(v), q: 'power', better: 'maxIfCapacity' },
        { label: 'Hottest junction', get: (m) => m.Tj, f: (v) => fmt('temp', v), q: 'temp', better: 'min' },
        { label: 'Margin to limit', get: (m) => m.margin, f: (v) => fmt('dtemp', v), q: 'dtemp', better: 'max' },
        { label: 'Power headroom', get: (m) => m.headroom, f: (v) => `×${U.fmtNumber(v, 2)}`, q: null, better: 'max' },
        { label: 'Peak plate surface', get: (m) => m.Tpeak, f: (v) => fmt('temp', v), q: 'temp', better: 'min' },
        { label: 'Plate temperature spread', get: (m) => m.spread, f: (v) => fmt('dtemp', v), q: 'dtemp', better: 'min' },
        { label: 'Coolant outlet', get: (m) => m.Tout, f: (v) => fmt('temp', v), q: 'temp' },
        { label: 'Volume flow (mean)', get: (m) => m.flow, f: (v) => fmt('volflow', v), q: 'volflow' },
        { label: 'Pressure drop', get: (m) => m.dp, f: (v) => fmt('dpressure', v), q: 'dpressure', better: 'min' },
        { label: 'Hydraulic pump power', get: (m) => m.pumpPower, f: pw, q: U.system === 'SI' ? 'power' : 'power2', better: 'min' },
        { label: 'Channel velocity', get: (m) => m.v, f: (v) => fmt('velocity', v), q: 'velocity' },
        { label: 'Reynolds number', get: (m) => m.Re, f: (v) => U.fmtNumber(v, 0), q: null },
        { label: 'Heat transfer coeff.', get: (m) => m.h, f: (v) => fmt('htc', v, { digits: U.system === 'SI' ? 0 : 1 }), q: 'htc', better: 'max' },
        { label: 'Lowest channel flow', get: (m) => m.flowMin, f: (v) => root.I18N.pct((100 * v).toFixed(0)), q: 'pct', better: 'max' },
        { label: 'Plate mass (dry)', get: (m) => m.mass, f: (v) => fmt('mass', v), q: 'mass', better: 'min' },
        { label: 'Coolant volume', get: (m) => m.fluidVol, f: (v) => fmt('volume', v), q: 'volume' },
      ];
    }

    /** Columns (current design + snapshots) with inputs, metrics and best/diff marks. */
    function compareModel() {
      const cur = ctx.current();
      const cols = [{ name: t('Current design'), s: cur.state, app: cur.app, m: cur.res && cur.res.ok ? metrics({ s: cur.s, res: cur.res, map: cur.map }) : { ok: false } }]
        .concat(snaps.map((sn, i) => ({ name: sn.name, s: sn.s, app: sn.app, m: evalCached(sn.s).m, idx: i })));
      const inputs = cols.map((c) => describe(c.s, c.app));
      const inRows = inputs[0].map((r, k) => ({ label: t(r[0]), vals: inputs.map((x) => x[k][1]), diff: inputs.map((x) => x[k][1] !== inputs[0][k][1]) }));
      const allCap = cols.every((c) => !c.m.ok || c.m.kind === 'q');
      const outRows = resultRows().map((r) => {
        const raw = cols.map((c) => (c.m.ok ? r.get(c.m) : null));
        const valid = raw.map((v) => v !== null && v !== undefined && isFinite(v));
        if (!valid.some(Boolean)) return null;
        let best = raw.map(() => false);
        const dir = r.better === 'maxIfCapacity' ? (allCap ? 'max' : null) : r.better;
        const vs = raw.filter((v, i) => valid[i]);
        if (dir && vs.length >= 2 && Math.max(...vs) - Math.min(...vs) > 1e-9 * Math.max(1, Math.abs(Math.max(...vs)))) {
          const target = dir === 'min' ? Math.min(...vs) : Math.max(...vs);
          best = raw.map((v, i) => valid[i] && Math.abs(v - target) <= 1e-9 * Math.max(1, Math.abs(target)));
        }
        return { label: t(r.label), raw, vals: raw.map((v, i) => (valid[i] ? r.f(v) : cols[i].m.ok ? '—' : t('Invalid'))), best, q: r.q };
      }).filter(Boolean);
      return { cols, inRows, outRows };
    }

    function renderCompare() {
      const box = $('compare-table');
      $('compare-csv').hidden = !snaps.length;
      $('compare-add').disabled = snaps.length >= MAX_SNAPS;
      box.textContent = '';
      if (!snaps.length) { box.appendChild(el('p', 'compare-empty', t('No saved designs yet. Click “Add current design”, change the inputs, and the saved variants appear here next to the current design.'))); return; }
      const { cols, inRows, outRows } = compareModel();
      const tbl = el('table', 'data compare');
      const head = tbl.createTHead().insertRow();
      head.appendChild(el('th', '', ''));
      cols.forEach((c) => {
        const th = el('th');
        if (c.idx === undefined) { th.appendChild(el('div', 'cmp-name', c.name)); }
        else {
          const name = el('input', 'cmp-name-input');
          name.type = 'text'; name.value = c.name; name.maxLength = 40;
          name.setAttribute('aria-label', t('Design name'));
          name.addEventListener('change', () => { snaps[c.idx].name = name.value.trim() || c.name; saveSnaps(); });
          const acts = el('div', 'cmp-actions');
          const load = el('button', 'btn btn-small', t('Load'));
          load.type = 'button'; load.title = t('Make this the current design');
          load.addEventListener('click', () => { ctx.load(clone(snaps[c.idx].s), snaps[c.idx].app); ctx.toast(t('Loaded {name}', { name: snaps[c.idx].name })); });
          const del = el('button', 'icon-btn', '✕');
          del.type = 'button'; del.title = t('Remove from comparison'); del.setAttribute('aria-label', t('Remove from comparison'));
          del.addEventListener('click', () => { snaps.splice(c.idx, 1); saveSnaps(); render(); });
          acts.append(load, del);
          th.append(name, acts);
        }
        head.appendChild(th);
      });
      const tb = tbl.createTBody();
      const section = (title) => { const tr = tb.insertRow(); tr.className = 'cmp-section'; const td = tr.insertCell(); td.colSpan = cols.length + 1; td.textContent = title; };
      section(t('Inputs'));
      for (const r of inRows) {
        const tr = tb.insertRow();
        tr.insertCell().textContent = r.label;
        r.vals.forEach((v, i) => { const td = tr.insertCell(); td.textContent = v; if (r.diff[i]) td.className = 'diff'; });
      }
      section(t('Results'));
      for (const r of outRows) {
        const tr = tb.insertRow();
        tr.insertCell().textContent = r.label;
        r.vals.forEach((v, i) => { const td = tr.insertCell(); td.textContent = v; if (r.best[i]) td.className = 'best'; });
      }
      box.appendChild(tbl);
    }

    function compareCsv() {
      const { cols, inRows, outRows } = compareModel();
      const rows = [[t('Parameter'), ...cols.map((c) => c.name)]];
      inRows.forEach((r) => rows.push([r.label, ...r.vals]));
      outRows.forEach((r) => {
        const unit = r.q === 'pct' ? '%' : r.q ? U.label(r.q) : '';
        const conv = (v) => (v === null || !isFinite(v) ? '' : r.q === 'pct' ? num(100 * v) : r.q ? num(U.toDisplay(r.q, v)) : num(v));
        rows.push([unit ? `${r.label} (${unit})` : r.label, ...r.raw.map(conv)]);
      });
      download(`cold-plate-comparison-${stamp()}.csv`, toCsv(rows));
    }

    // ===== Parameter sweep =====

    let sw = { key: null, from: null, to: null, n: 9 };   // inputs (SI)
    let sweep = null;                                    // last result
    let token = 0, lastSystem = null;

    function paramOf(key) { return PARAMS.find((p) => p.key === key); }

    function defaults(p, s) {
      const v = paramValue(s, p.key);
      if (p.q === 'temp') return [v - 20, v + 20];
      if (p.q === 'int') return [Math.max(1, Math.round(v / 2)), Math.max(2, Math.round(v * 2))];
      if (p.q === 'factor') return [0.5, 1.5];
      return [v * 0.5, v * 2];
    }

    function renderSweepControls() {
      const s = ctx.current().state;
      const sel = $('sweep-param');
      const avail = paramsFor(s);
      if (!avail.some((p) => p.key === sw.key)) { sw.key = avail.some((p) => p.key === 'flow') ? 'flow' : avail[0].key; sw.from = null; }
      sel.textContent = '';
      avail.forEach((p) => sel.appendChild(new Option(t(paramLabel(p, s)), p.key)));
      sel.value = sw.key;
      const p = paramOf(sw.key);
      if (sw.from === null) [sw.from, sw.to] = defaults(p, s);
      const u = unitOf(p, s);
      $('sweep-u1').textContent = u ? `(${u})` : ''; $('sweep-u2').textContent = u ? `(${u})` : '';
      // Rewrite the range fields only when the parameter or unit system changed, not while typing.
      if (lastSystem !== U.system + sw.key) {
        const show = (si) => (p.q === 'int' ? String(Math.round(si)) : String(+toD(p, s, si).toPrecision(4)));
        $('sweep-from').value = show(sw.from);
        $('sweep-to').value = show(sw.to);
        $('sweep-n').value = sw.n;
        lastSystem = U.system + sw.key;
      }
    }

    function readRange() {
      const s = ctx.current().state, p = paramOf(sw.key);
      const a = parseFloat($('sweep-from').value), b = parseFloat($('sweep-to').value), n = parseInt($('sweep-n').value, 10);
      const okN = n >= 3 && n <= 25;
      $('sweep-from').classList.toggle('bad', !isFinite(a));
      $('sweep-to').classList.toggle('bad', !isFinite(b) || a === b);
      $('sweep-n').classList.toggle('bad', !okN);
      if (!isFinite(a) || !isFinite(b) || a === b || !okN) return false;
      sw.from = fromD(p, s, a); sw.to = fromD(p, s, b); sw.n = n;
      return true;
    }

    function runSweep() {
      if (!readRange()) return;
      const cur = ctx.current();
      const s = clone(cur.state), p = paramOf(sw.key);
      const curV = paramValue(s, p.key);
      const xs = sweepValues(sw.from, sw.to, sw.n, p.q === 'int', curV);
      const my = ++token;
      const gas = Data.FLUIDS[s.fluid].phase === 'gas';
      const rows = [];
      let i = 0;
      $('sweep-run').disabled = true;
      const status = $('sweep-status');
      const step = () => {
        if (my !== token) return;
        const t0 = performance.now();
        while (i < xs.length && performance.now() - t0 < 40) {
          const d = evaluateDesign(applyParam(s, p.key, xs[i]), { maxCells: gas ? 1200 : 2500 });
          rows.push({ x: xs[i], m: metrics(d), d });
          i++;
        }
        status.textContent = t('Calculating… {i} of {n}', { i, n: xs.length });
        if (i < xs.length) { setTimeout(step, 0); return; }
        $('sweep-run').disabled = false;
        sweep = { key: p.key, base: JSON.stringify(s), state: s, current: curV, rows, kind: rows.find((r) => r.m.ok) ? rows.find((r) => r.m.ok).m.kind : null };
        renderSweep();
      };
      status.textContent = t('Calculating… {i} of {n}', { i: 0, n: xs.length });
      setTimeout(step, 0);
    }

    const KIND = {
      tj: { title: 'Hottest junction', q: 'temp' },
      q: { title: 'Max. heat dissipation', q: 'power' },
      tmax: { title: 'Peak surface temperature', q: 'temp' },
    };

    /** Sweep table model (strings and CSV numbers); null when there is no sweep. */
    function sweepModel() {
      if (!sweep || !sweep.kind) return null;
      const s = sweep.state, p = paramOf(sweep.key), k = KIND[sweep.kind];
      const parallel = !serp(s), pump = s.flowSource === 'pump', src = sweep.kind === 'tj';
      const pw = (v) => (U.system === 'SI' ? fmt('power', v, { digits: 2 }) : fmt('power2', v, { digits: 4 }));
      const cols = [
        { h: t(paramLabel(p, s)), u: unitOf(p, s), get: (r) => r.x, f: (v) => fmtParam(p, s, v), c: (v) => toD(p, s, v) },
        { h: t(k.title), u: k.q === 'power' ? 'W' : U.label('temp'), get: (r) => r.m.headline, f: (v) => (k.q === 'power' ? ctx.fmtPower(v) : fmt('temp', v)), c: (v) => (k.q === 'power' ? v : U.toDisplay('temp', v)) },
      ];
      if (src) cols.push({ h: t('Margin to limit'), u: U.label('dtemp'), get: (r) => r.m.margin, f: (v) => fmt('dtemp', v), c: (v) => U.toDisplay('dtemp', v) });
      if (sweep.kind !== 'tmax') cols.push({ h: t('Peak plate surface'), u: U.label('temp'), get: (r) => r.m.Tpeak, f: (v) => fmt('temp', v), c: (v) => U.toDisplay('temp', v) });
      cols.push({ h: t('Coolant outlet'), u: U.label('temp'), get: (r) => r.m.Tout, f: (v) => fmt('temp', v), c: (v) => U.toDisplay('temp', v) });
      if (pump || p.key === 'Tin' || p.key === 'pIn') cols.push({ h: t('Volume flow (mean)'), u: U.label('volflow'), get: (r) => r.m.flow, f: (v) => fmt('volflow', v), c: (v) => U.toDisplay('volflow', v) });
      cols.push({ h: t('Pressure drop'), u: U.label('dpressure'), get: (r) => r.m.dp, f: (v) => fmt('dpressure', v), c: (v) => U.toDisplay('dpressure', v) });
      cols.push({ h: t('Hydraulic pump power'), u: U.system === 'SI' ? 'W' : 'hp', get: (r) => r.m.pumpPower, f: pw, c: (v) => U.toDisplay(U.system === 'SI' ? 'power' : 'power2', v) });
      cols.push({ h: t('Channel velocity'), u: U.label('velocity'), get: (r) => r.m.v, f: (v) => fmt('velocity', v), c: (v) => U.toDisplay('velocity', v) });
      if (parallel) cols.push({ h: t('Lowest channel flow'), u: '%', get: (r) => r.m.flowMin, f: (v) => root.I18N.pct((100 * v).toFixed(0)), c: (v) => 100 * v });
      const curI = sweep.rows.findIndex((r) => Math.abs(r.x - sweep.current) <= 1e-9 * Math.max(1, Math.abs(sweep.current)));
      return { p, s, k, cols, curI };
    }

    function stale() { return sweep && JSON.stringify(ctx.current().state) !== sweep.base; }

    function renderSweep() {
      const out = $('sweep-out'), tableBox = $('sweep-table'), status = $('sweep-status');
      const model = sweepModel();
      $('sweep-csv').hidden = !model;
      out.hidden = !model;
      tableBox.textContent = '';
      if (!sweep) { status.textContent = ''; return; }
      if (!model) { status.textContent = t('No valid points in this range — check the inputs.'); return; }
      const bad = sweep.rows.filter((r) => !r.m.ok).length;
      const isStale = stale();
      $('sweep-card').classList.toggle('stale', isStale);
      status.textContent = isStale ? t('Inputs have changed since this sweep — run it again to update.')
        : bad ? t('{n} of {m} points are invalid in this range (for example, channels that do not fit) and are left out.', { n: bad, m: sweep.rows.length }) : '';

      const { p, s, k, cols, curI } = model;
      const ok = sweep.rows.filter((r) => r.m.ok);
      const xD = (v) => toD(p, s, v);
      const u = unitOf(p, s);
      const xTitle = u ? `${t(paramLabel(p, s))} (${u})` : t(paramLabel(p, s));
      const fmtX = (v) => (p.q === 'int' ? String(Math.round(v)) : U.fmtNumber(v));
      const fmtXFull = (v) => (p.q === 'factor' ? `×${U.fmtNumber(v, 2)}` : `${fmtX(v)} ${u}`.trim());
      const cur = curI >= 0 && sweep.rows[curI].m.ok ? sweep.rows[curI] : null;
      $('sweep-t1').textContent = t(k.title);
      const isT = k.q === 'temp';
      root.Charts.lineChart($('sweep-chart1'), {
        data: ok.map((r) => ({ x: xD(r.x), y: isT ? U.toDisplay('temp', r.m.headline) : r.m.headline })),
        op: cur ? { x: xD(cur.x), y: isT ? U.toDisplay('temp', cur.m.headline) : cur.m.headline } : null,
        opLabel: t('Current'),
        xFrom: 'data', yFrom: isT ? 'data' : 'zero',
        xTitle, yTitle: isT ? `${t(k.title)} (${U.label('temp')})` : t('Heat (W)'), fmtX, fmtXFull,
        fmtY: (v) => (isT ? U.fmtNumber(v) : v >= 1000 ? U.fmtNumber(v / 1000) + 'k' : U.fmtNumber(v)),
        fmtYFull: (v) => (isT ? `${U.fmtNumber(v, 1)} ${U.label('temp')}` : ctx.fmtPower(v)),
      });
      $('sweep-t2').textContent = t('Pressure drop');
      root.Charts.lineChart($('sweep-chart2'), {
        data: ok.map((r) => ({ x: xD(r.x), y: U.toDisplay('dpressure', r.m.dp) })),
        op: cur ? { x: xD(cur.x), y: U.toDisplay('dpressure', cur.m.dp) } : null, opLabel: t('Current'),
        xFrom: 'data',
        xTitle, yTitle: t('Pressure drop ({u})', { u: U.label('dpressure') }), fmtX, fmtXFull,
        fmtY: (v) => U.fmtNumber(v), fmtYFull: (v) => `${U.fmtNumber(v)} ${U.label('dpressure')}`,
      });

      const tbl = el('table', 'data sweep');
      const head = tbl.createTHead().insertRow();
      cols.forEach((c) => head.appendChild(el('th', '', c.h)));
      head.appendChild(el('th', '', ''));
      const tb = tbl.createTBody();
      sweep.rows.forEach((r, i) => {
        const tr = tb.insertRow();
        if (i === curI) tr.className = 'current';
        cols.forEach((c, j) => {
          const v = j === 0 ? r.x : r.m.ok ? c.get(r) : null;
          const td = tr.insertCell();
          td.textContent = v === null || v === undefined || !isFinite(v) ? (j > 0 && !r.m.ok ? t('Invalid') : '—') : c.f(v);
          if (j === 1 && r.m.ok && sweep.kind === 'tj' && r.m.margin < 0) td.className = 'over';
        });
        const td = tr.insertCell();
        if (i !== curI && r.m.ok) {
          const b = el('button', 'btn btn-small', t('Use'));
          b.type = 'button'; b.title = t('Set this value in the design');
          b.addEventListener('click', () => {
            const n = applyParam(ctx.current().state, sweep.key, r.x);
            sweep.base = JSON.stringify(n);
            sweep.state = clone(n);
            sweep.current = paramValue(n, sweep.key);
            ctx.load(n);
          });
          td.appendChild(b);
        } else if (i === curI) td.appendChild(el('span', 'muted', t('Current')));
      });
      tableBox.appendChild(tbl);
    }

    function sweepCsv() {
      const model = sweepModel();
      if (!model) return;
      const rows = [model.cols.map((c) => (c.u ? `${c.h} (${c.u})` : c.h))];
      sweep.rows.forEach((r) => rows.push(model.cols.map((c, j) => {
        const v = j === 0 ? r.x : r.m.ok ? c.get(r) : null;
        return v === null || v === undefined || !isFinite(v) ? '' : num(c.c(v));
      })));
      download(`cold-plate-sweep-${sweep.key}-${stamp()}.csv`, toCsv(rows));
    }

    // ===== Wiring =====

    $('compare-add').addEventListener('click', addSnapshot);
    $('compare-csv').addEventListener('click', compareCsv);
    $('sweep-param').addEventListener('change', (e) => { sw.key = e.target.value; sw.from = null; lastSystem = null; renderSweepControls(); });
    $('sweep-run').addEventListener('click', runSweep);
    $('sweep-csv').addEventListener('click', sweepCsv);
    for (const id of ['sweep-from', 'sweep-to', 'sweep-n']) {
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runSweep(); } });
      $(id).addEventListener('change', readRange);
    }

    function render() {
      renderCompare();
      renderSweepControls();
      renderSweep();
    }

    /** Tables for the PDF report: { headers, rows, marks } or null. */
    function reportData() {
      const out = { compare: null, sweep: null };
      if (snaps.length) {
        const { cols, inRows, outRows } = compareModel();
        out.compare = {
          headers: ['', ...cols.map((c) => c.name)],
          rows: [{ section: t('Inputs') }, ...inRows.map((r) => ({ cells: [r.label, ...r.vals], marks: [false, ...r.diff], mark: 'diff' })),
            { section: t('Results') }, ...outRows.map((r) => ({ cells: [r.label, ...r.vals], marks: [false, ...r.best], mark: 'best' }))],
        };
      }
      const model = sweepModel();
      if (model && !stale()) {
        out.sweep = {
          title: t('{y} vs. {x}', { y: t(model.k.title), x: t(paramLabel(model.p, model.s)) }),
          headers: model.cols.map((c) => c.h),
          rows: sweep.rows.map((r, i) => ({
            cells: model.cols.map((c, j) => { const v = j === 0 ? r.x : r.m.ok ? c.get(r) : null; return v === null || v === undefined || !isFinite(v) ? '—' : c.f(v); }),
            bold: i === model.curI,
          })),
        };
      }
      return out;
    }

    return { render, reportData };
  }

  Study.init = init;
  root.Study = Study;
})(typeof window !== 'undefined' ? window : globalThis);
