/*
 * Transient load card: builds a load profile (step/overload or pulse train),
 * runs Physics2D.transient in small chunks and shows the temperature history,
 * the time to reach a limit and the steady state the load would reach.
 */
(function (root) {
  'use strict';

  const clone = (o) => JSON.parse(JSON.stringify(o));

  /** Round to 1, 2 or 5 × 10^k. */
  function nice(v) {
    if (!(v > 0)) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / e;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
  }

  /** Load profile for Physics2D.transient. */
  function buildProfile(p) {
    if (p.kind === 'pulse') {
      const cyc = Math.max(1, Math.min(200, Math.round(p.cyc)));
      const on = p.per * p.duty / 100, off = p.per - on;
      const k = Math.max(4, Math.min(30, Math.floor(800 / (2 * cyc))));
      const segs = [];
      for (let i = 0; i < cyc; i++) {
        segs.push({ dur: on, f: p.pf1, n: k, first: 0.02 });
        if (off > 0) segs.push({ dur: off, f: p.pf0, n: k, first: 0.02 });
      }
      return { f0: p.pf0, segments: segs };
    }
    const segs = [{ dur: p.t1, f: p.f1, n: 90, first: 1e-3 }];
    if (p.t2 > 0) segs.push({ dur: p.t2, f: p.f2, n: 90, first: 1e-3 });
    return { f0: p.f0, segments: segs };
  }

  /** First time a series crosses `limit` upwards (linear interpolation), or null. */
  function crossing(t, y, limit) {
    if (y[0] >= limit) return 0;
    for (let i = 1; i < y.length; i++) {
      if (y[i] >= limit) return t[i - 1] + (t[i] - t[i - 1]) * (limit - y[i - 1]) / (y[i] - y[i - 1]);
    }
    return null;
  }

  /**
   * ctx: { t, fmtPower, toast, current() → { state, s, res, map }, Physics, Physics2D }
   */
  function init(ctx) {
    const t = ctx.t, U = root.Units;
    const $ = (id) => document.getElementById(id);
    const fmt = (q, v, o) => U.format(q, v, o);
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
    const num = (v) => (isFinite(v) ? +v.toPrecision(5) : '');

    let prof = null;       // profile inputs
    let run = null;        // last result
    let token = 0;

    /** Design heat load and heat capacities of the current design. */
    function designInfo() {
      const cur = ctx.current(), s = cur.state;
      if (!cur.res || !cur.res.ok) return null;
      const srcMode = s.heatArea === 'sources';
      const Q = srcMode ? (s.sources || []).reduce((a, x) => a + x.P, 0) : cur.map ? cur.map.Qtotal : s.mode === 'capacity' ? cur.res.Q : s.Q;
      const mat = root.CPData.MATERIALS[s.material];
      const cpS = s.material === 'custom' ? s.cpCustom || mat.cp : mat.cp;
      const Cplate = cur.res.plateMass * cpS;
      const Csrc = srcMode ? (s.sources || []).reduce((a, x) => a + (x.cth || 0), 0) : 0;
      const Tpeak = cur.map ? cur.map.Tmax : cur.res.TsMax;
      const Rth = Q > 0 ? (Tpeak - s.Tin) / Q : NaN;
      const tau = (Cplate + Csrc) * Rth;
      const transit = cur.res.fluidVol / cur.res.volFlow;
      return { Q, Cplate, Csrc, tau, transit, srcMode };
    }

    function defaults(info) {
      const tau = info && isFinite(info.tau) && info.tau > 0 ? info.tau : 30;
      return { kind: 'step', f0: 1, f1: 1.5, t1: nice(2 * tau), f2: 1, t2: nice(2 * tau), pf0: 1, pf1: 2, per: nice(tau / 4), duty: 20, cyc: 20 };
    }

    const FIELDS = { f0: 'tr-f0', f1: 'tr-f1', t1: 'tr-t1', f2: 'tr-f2', t2: 'tr-t2', pf0: 'tr-pf0', pf1: 'tr-pf1', per: 'tr-per', duty: 'tr-duty', cyc: 'tr-cyc' };

    function renderControls() {
      const info = designInfo();
      if (!prof) {
        prof = defaults(info);
        for (const [k, id] of Object.entries(FIELDS)) $(id).value = prof[k];
      }
      for (const b of document.querySelectorAll('#tr-kind [data-kind]')) b.setAttribute('aria-checked', String(b.dataset.kind === prof.kind));
      for (const d of document.querySelectorAll('.tr-fields')) d.hidden = d.dataset.trkind !== prof.kind;
      $('tr-hint').textContent = !info ? '' : t('Heat capacity: plate {cp}, components {cs}. Estimated time constant ≈ {tau}. Use 0 × load before the step for a cold start.', {
        cp: fmt('heatcap', info.Cplate), cs: fmt('heatcap', info.Csrc), tau: fmtTime(info.tau),
      });
    }

    function fmtTime(s) {
      if (!isFinite(s)) return '—';
      if (s >= 3600) return `${U.fmtNumber(s / 3600, 2)} h`;
      if (s >= 120) return `${U.fmtNumber(s / 60, 1)} min`;
      return `${U.fmtNumber(s)} s`;
    }

    function readProfile() {
      let ok = true;
      const p = { kind: prof.kind };
      const keys = prof.kind === 'step' ? ['f0', 'f1', 't1', 'f2', 't2'] : ['pf0', 'pf1', 'per', 'duty', 'cyc'];
      for (const k of keys) {
        const v = parseFloat($(FIELDS[k]).value);
        const bad = !isFinite(v) || v < 0 || (k === 't1' && v <= 0) || (k === 'per' && v <= 0) || (k === 'duty' && (v <= 0 || v >= 100)) || (k === 'cyc' && v < 1);
        $(FIELDS[k]).classList.toggle('bad', bad);
        if (bad) ok = false;
        p[k] = v;
      }
      if (!ok) return null;
      Object.assign(prof, p);
      return p;
    }

    function runTransient() {
      const p = readProfile();
      const info = designInfo();
      if (!p || !info) return;
      const cur = ctx.current();
      // Run the 1D/2D model at the design heat load (factor 1); the profile scales it.
      const sLoad = Object.assign(clone(cur.s), { mode: 'load', Q: info.Q });
      const base = ctx.Physics.solve(sLoad, {});
      if (!base.ok) return;
      const profile = buildProfile(p);
      const gas = root.CPData.FLUIDS[sLoad.fluid].phase === 'gas';
      const gen = ctx.Physics2D.transient(sLoad, base, profile, { maxCells: gas ? 1200 : 2500 });
      const my = ++token;
      $('tr-run').disabled = true;
      const step = () => {
        if (my !== token) return;
        const t0 = performance.now();
        let r;
        do { r = gen.next(); } while (!r.done && performance.now() - t0 < 40);
        if (!r.done) {
          $('tr-status').textContent = t('Calculating… {i} of {n}', { i: r.value.done, n: r.value.total });
          setTimeout(step, 0);
          return;
        }
        $('tr-run').disabled = false;
        run = { hist: r.value, p: clone(p), base: JSON.stringify(cur.state), state: clone(cur.state), s: sLoad, info, Q: info.Q, Tin: sLoad.Tin };
        render();
      };
      $('tr-status').textContent = t('Calculating…');
      setTimeout(step, 0);
    }

    /** Series and key numbers of the last run. */
    function model() {
      if (!run) return null;
      const { hist, s, p } = run;
      const srcMode = s.heatArea === 'sources' && (s.sources || []).length > 0;
      const Tin = run.Tin;
      let main, mainName, limit = null;
      if (srcMode) {
        // The critical component: least margin to its limit at any time.
        let k = 0, best = Infinity;
        s.sources.forEach((src, i) => { const m = src.Tlimit - Math.max(...hist.src[i]); if (m < best) { best = m; k = i; } });
        main = hist.src[k]; mainName = s.sources[k].name; limit = s.sources[k].Tlimit;
        run.k = k;
      } else {
        main = hist.Tmax; mainName = null;
        if (s.mode === 'capacity' || run.state.mode === 'capacity') limit = run.state.TsMax;
      }
      const iPeak = main.reduce((b, v, i) => (v > main[b] ? i : b), 0);
      const tLimit = limit !== null ? crossing(hist.t, main, limit) : null;
      // Steady state at a load factor: temperatures rise linearly with heat at fixed properties.
      const anyF = Object.keys(hist.steady).map(Number).find((f) => f > 0);
      const steadyOf = (f, plate) => {
        if (!anyF) return Tin;
        const sn = hist.steady[anyF];
        const v = srcMode && !plate ? sn.src[run.k] : sn.Tmax;
        return Tin + (f / anyF) * (v - Tin);
      };
      const steadyAt = (f) => steadyOf(f, false);
      const out = { srcMode, main, mainName, limit, iPeak, tLimit, steadyAt, Tin };
      if (p.kind === 'step') {
        // 63 % response time of the plate (peak plate temperature) to the step; the junction also
        // jumps instantly by ΔP·(R_jc + R_TIM) because those layers have no heat capacity here.
        const P0 = hist.Tmax[0], Pss = steadyOf(p.f1, true);
        const i1 = hist.t.findIndex((x) => x >= p.t1 - 1e-9);
        const seg = { t: hist.t.slice(0, i1 + 1), y: hist.Tmax.slice(0, i1 + 1) };
        const target = P0 + 0.632 * (Pss - P0);
        out.t63 = Math.abs(Pss - P0) > 1e-6 ? (Pss > P0 ? crossing(seg.t, seg.y, target) : crossing(seg.t, seg.y.map((v) => -v), -target)) : null;
        out.Tss = steadyAt(p.f1);
      } else {
        const per = p.per, tEnd = hist.t[hist.t.length - 1];
        const last = main.filter((v, i) => hist.t[i] >= tEnd - per - 1e-9);
        out.swing = Math.max(...last) - Math.min(...last);
        out.TssPulse = steadyAt(p.pf1);
        out.TssAvg = steadyAt(p.pf0 + (p.pf1 - p.pf0) * p.duty / 100);
      }
      return out;
    }

    function render() {
      const out = $('tr-out'), sum = $('tr-summary'), status = $('tr-status');
      renderControls();
      const m = model();
      $('tr-csv').hidden = !m;
      out.hidden = !m;
      sum.textContent = '';
      if (!m) { if (!run) status.textContent = ''; return; }
      const stale = JSON.stringify(ctx.current().state) !== run.base;
      $('tr-card').classList.toggle('stale', stale);
      const notes = [];
      if (stale) notes.push(t('Inputs have changed since this run — run it again to update.'));
      const shortest = run.p.kind === 'pulse' ? Math.min(run.p.per * run.p.duty / 100, run.p.per * (1 - run.p.duty / 100)) : run.p.t1;
      if (m.srcMode && run.s.sources.some((x) => (x.rjc || 0) > 0 || x.tim > 0)) notes.push(t('Junction-to-case and TIM layers have no heat capacity in this model, so their share of a load change appears at once (conservative).'));
      if (run.info.transit > 0.1 * shortest) notes.push(t('The coolant needs {tt} to pass through the plate — not short compared with this load profile, so the quasi-steady coolant model is approximate.', { tt: fmtTime(run.info.transit) }));
      status.textContent = notes.join(' ');

      const { hist } = run;
      const add = (k, v, sub) => { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); if (sub) d.appendChild(el('dd', 'sub', sub)); sum.appendChild(d); };
      const label = m.srcMode ? t('{name} junction', { name: m.mainName }) : t('Peak plate surface');
      add(t('Peak: {what}', { what: label }), fmt('temp', m.main[m.iPeak]), t('at {time}', { time: fmtTime(hist.t[m.iPeak]) }));
      if (m.limit !== null) add(t('Time to limit ({T})', { T: fmt('temp', m.limit) }), m.tLimit === null ? t('Not reached') : fmtTime(m.tLimit));
      if (run.p.kind === 'step') {
        add(t('Steady state at ×{f}', { f: U.fmtNumber(run.p.f1, 2) }), fmt('temp', m.Tss), t('if the overload lasts'));
        add(t('Plate response time (63 %)'), m.t63 === null ? '—' : fmtTime(m.t63));
      } else {
        add(t('Swing in the last cycle'), fmt('dtemp', m.swing));
        add(t('Steady state at average load'), fmt('temp', m.TssAvg));
        add(t('Steady state at pulse load'), fmt('temp', m.TssPulse));
      }
      add(t('Coolant transit time'), fmtTime(run.info.transit));

      // Time axis in s, min or h.
      const tEnd = hist.t[hist.t.length - 1];
      const tu = tEnd >= 7200 ? ['h', 3600] : tEnd >= 600 ? ['min', 60] : ['s', 1];
      const tx = (v) => v / tu[1];
      const xTitle = t('Time ({u})', { u: tu[0] });
      const fmtX = (v) => U.fmtNumber(v);
      const fmtXFull = (v) => `${U.fmtNumber(v)} ${tu[0]}`;
      const TD = (v) => U.toDisplay('temp', v);
      const series = [{ name: label, short: m.srcMode ? m.mainName : t('Peak'), data: hist.t.map((x, i) => ({ x: tx(x), y: TD(m.main[i]) })) }];
      if (m.srcMode) series.push({ name: t('Peak plate surface'), short: t('Plate'), data: hist.t.map((x, i) => ({ x: tx(x), y: TD(hist.Tmax[i]) })) });
      else series.push({ name: t('Coolant outlet'), short: t('Outlet'), data: hist.t.map((x, i) => ({ x: tx(x), y: TD(hist.Tout[i]) })) });
      if (m.limit !== null) series.push({ name: t('Limit'), short: t('Limit'), data: [{ x: 0, y: TD(m.limit) }, { x: tx(tEnd), y: TD(m.limit) }] });
      root.Charts.lineChart($('tr-chart1'), {
        series, xTitle, yTitle: t('Temperature ({u})', { u: U.label('temp') }), yFrom: 'data',
        fmtX, fmtXFull, fmtY: (v) => U.fmtNumber(v), fmtYFull: (v) => `${U.fmtNumber(v, 1)} ${U.label('temp')}`,
      });
      // Heat load as a step plot; with component heat capacity, also the heat that reaches the plate.
      const steps = [];
      for (let i = 1; i < hist.t.length; i++) { steps.push({ x: tx(hist.t[i - 1]), y: hist.f[i] * run.Q }, { x: tx(hist.t[i]), y: hist.f[i] * run.Q }); }
      const loadSeries = [{ name: t('Heat load'), short: t('Load'), data: [{ x: 0, y: hist.f[0] * run.Q }, ...steps] }];
      if (hist.Csrc.some((c) => c > 0)) loadSeries.push({ name: t('Heat into the plate'), short: t('Plate'), data: hist.t.map((x, i) => ({ x: tx(x), y: hist.Q[i] })) });
      root.Charts.lineChart($('tr-chart2'), {
        series: loadSeries, xTitle, yTitle: t('Heat (W)'),
        fmtX, fmtXFull, fmtY: (v) => (v >= 1000 ? U.fmtNumber(v / 1000) + 'k' : U.fmtNumber(v)), fmtYFull: ctx.fmtPower,
      });
    }

    function csv() {
      const m = model();
      if (!m) return;
      const { hist, s } = run;
      const tu = U.label('temp');
      const head = [t('Time (s)'), t('Load factor'), `${t('Heat load')} (W)`, `${t('Peak plate surface')} (${tu})`, `${t('Coolant outlet')} (${tu})`];
      const srcs = m.srcMode ? s.sources : [];
      srcs.forEach((src) => head.push(`${t('{name} junction', { name: src.name })} (${tu})`));
      const rows = [head];
      hist.t.forEach((x, i) => {
        rows.push([num(x), num(hist.f[i]), num(hist.f[i] * run.Q), num(U.toDisplay('temp', hist.Tmax[i])), num(U.toDisplay('temp', hist.Tout[i])),
          ...srcs.map((_, k) => num(U.toDisplay('temp', hist.src[k][i])))]);
      });
      const blob = new Blob(['﻿' + root.Study.toCsv(rows)], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cold-plate-transient-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }

    /** Summary rows for the PDF report, or null when there is no current run. */
    function reportData() {
      const m = model();
      if (!m || JSON.stringify(ctx.current().state) !== run.base) return null;
      const rows = [...$('tr-summary').children].map((d) => {
        const dds = d.querySelectorAll('dd');
        return [d.querySelector('dt').textContent, [...dds].map((x) => x.textContent).join(' · ')];
      });
      const p = run.p;
      const profileTxt = p.kind === 'step'
        ? t('Step: ×{f0} → ×{f1} for {t1} → ×{f2} for {t2}', { f0: p.f0, f1: p.f1, t1: fmtTime(p.t1), f2: p.f2, t2: fmtTime(p.t2) })
        : t('Pulsed: ×{f0} base, ×{f1} pulses, period {per}, duty {d} %, {n} cycles', { f0: p.pf0, f1: p.pf1, per: fmtTime(p.per), d: p.duty, n: p.cyc });
      return { profile: profileTxt, rows, note: $('tr-hint').textContent };
    }

    $('tr-run').addEventListener('click', runTransient);
    $('tr-csv').addEventListener('click', csv);
    for (const b of document.querySelectorAll('#tr-kind [data-kind]')) b.addEventListener('click', () => { prof.kind = b.dataset.kind; renderControls(); });
    for (const id of Object.values(FIELDS)) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runTransient(); } });

    return { render, reportData };
  }

  const Transient = { init, buildProfile, crossing, nice };
  if (typeof module !== 'undefined' && module.exports) module.exports = Transient;
  else root.Transient = Transient;
})(typeof window !== 'undefined' ? window : globalThis);
