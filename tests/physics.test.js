// Sanity checks for the physics model and unit conversions. Run: node tests/physics.test.js
'use strict';
const assert = require('assert');
const P = require('../js/physics.js');
const D = require('../js/data.js');
const U = require('../js/units.js');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what || ''} expected ${b} ± ${tol}, got ${a}`);

console.log('Correlations');
check('round laminar f·Re = 64, Nu = 4.364', () => {
  const r = P.laminarFD('round', 1); near(r.fRe, 64, 1e-9); near(r.Nu, 4.364, 1e-9);
});
check('square duct f·Re ≈ 56.9, Nu_H1 ≈ 3.61 (Shah & London)', () => {
  const r = P.laminarFD('rect', 1); near(r.fRe, 56.91, 0.1); near(r.Nu, 3.61, 0.02);
});
check('parallel plates limit f·Re → 96, Nu_H1 → 8.235', () => {
  const r = P.laminarFD('rect', 0); near(r.fRe, 96, 1e-9); near(r.Nu, 8.235, 1e-9);
});
check('developing laminar friction approaches fully developed for long ducts', () => {
  near(P.laminarFApp(64, 1000, 0.005, 100) * 1000, 64, 0.5);
});
check('Haaland smooth f(Re=1e4) ≈ 0.0309 (Moody)', () => near(P.turbulentF(1e4, 0), 0.0309, 0.0008));
check('Gnielinski Nu(Re=1e4, Pr=7) ≈ 78 for long tube', () => {
  const f = P.turbulentF(1e4, 0); near(P.turbulentNu(f, 1e4, 7, 0.01, 1e6), 78, 3);
});

console.log('Properties');
check('water at 20 °C', () => {
  const p = P.fluidProps('water', 20, 101325);
  near(p.rho, 998.2, 0.1); near(p.mu, 1.002e-3, 1e-6); near(p.cp, 4182, 1);
});
check('water boils at ~100 °C at 1 atm, ~120 °C at 2 bar', () => {
  near(P.waterTsat(101325), 100, 0.3); near(P.waterTsat(2e5), 120.2, 1);
});
check('air density at 20 °C, 1 atm ≈ 1.204 kg/m³', () => near(P.fluidProps('air', 20, 101325).rho, 1.204, 0.005));
check('air viscosity at 300 K ≈ 1.85e-5 Pa·s', () => near(P.fluidProps('air', 26.85, 101325).mu, 1.85e-5, 0.03e-5));
check('H₂ conductivity at 300 K ≈ 0.18 W/m·K', () => near(P.fluidProps('h2', 26.85, 101325).k, 0.182, 0.006));

console.log('Model');
for (const [id, p] of Object.entries(D.PRESETS)) {
  check(`preset "${id}" solves, energy balance closes`, () => {
    const r = P.solve(p.state);
    assert.ok(r.ok, r.issues.map((i) => i.msg).join('; '));
    near(r.Q, r.mdot * r.props.cp * (r.Tout - r.Tin), 1e-6 * r.Q + 1e-9, 'Q');
    assert.ok(r.TsMax > r.Tout, 'surface hotter than outlet');
    assert.ok(r.dp > 0 && r.h > 0);
  });
}
check('load mode inverts capacity mode', () => {
  const s = Object.assign({}, D.PRESETS.inverter.state);
  const cap = P.solve(s);
  const load = P.solve(Object.assign({}, s, { mode: 'load', Q: cap.Q }));
  near(load.TsMax, s.TsMax, 0.05);
});
check('more flow → more capacity and more pressure drop', () => {
  const s = D.PRESETS.inverter.state;
  const a = P.solve(s), b = P.solve(Object.assign({}, s, { flow: s.flow * 2 }));
  assert.ok(b.Q > a.Q && b.dp > a.dp);
});
check('copper outperforms stainless steel', () => {
  const s = D.PRESETS.inverter.state;
  const cu = P.solve(Object.assign({}, s, { material: 'cu110' })), ss = P.solve(Object.assign({}, s, { material: 'ss304' }));
  assert.ok(cu.Q > ss.Q * 1.2);
});
check('channels that do not fit are rejected', () => {
  const r = P.solve(Object.assign({}, D.PRESETS.inverter.state, { count: 40 }));
  assert.ok(!r.ok);
});

console.log('2D plate model');
const P2 = require('../js/physics2d.js');
for (const [id, p] of Object.entries(D.PRESETS)) {
  check(`preset "${id}" 2D energy balance closes`, () => {
    const { map } = P2.evaluate(p.state);
    near(map.QtoFluid, map.Qin, 1e-3 * map.Qin + 1e-6, 'heat to coolant');
    assert.ok(map.Tmax > map.Tout && map.Tmin >= p.state.Tin - 1e-6);
  });
}
check('uniform copper plate: 2D capacity within 15 % of 1D', () => {
  const s = Object.assign({}, D.PRESETS.copper.state);
  const { base, map } = P2.evaluate(s);
  assert.ok(Math.abs(map.Qtotal / base.Q - 1) < 0.15, `1D ${base.Q.toFixed(0)} W vs 2D ${map.Qtotal.toFixed(0)} W`);
});
check('source: junction > case > plate, TIM drop = P·(t/k + Rc)/A', () => {
  const { map } = P2.evaluate(D.PRESETS.inverter.state);
  const src = D.PRESETS.inverter.state.sources[0], r = map.sources[0];
  assert.ok(r.Tj > r.Tcase && r.Tcase > r.Tplate);
  near(r.Tcase - r.Tplate, src.P * (src.tim / src.kTim + src.rcTim) / (src.w * src.h), 1e-9);
  near(r.Tj - r.Tcase, src.P * src.rjc, 1e-9);
});
check('headroom scales the hottest junction exactly to its limit', () => {
  const s = D.PRESETS.inverter.state;
  const { map } = P2.evaluate(s);
  const f = map.headroom;
  const scaled = Object.assign({}, s, { sources: s.sources.map((x) => Object.assign({}, x, { P: x.P * f })) });
  const r2 = P2.evaluate(scaled).map;
  const worst = Math.max(...r2.sources.map((r) => r.Tj - r.limit));
  near(worst, 0, 1.5); // properties shift slightly with the higher coolant temperature
});
check('2D grid refinement changes battery peak by < 0.5 K', () => {
  const s = D.PRESETS.battery.state;
  const a = P2.evaluate(s, { maxCells: 3000 }).map.Tmax, b = P2.evaluate(s, { maxCells: 12000 }).map.Tmax;
  near(a, b, 0.5);
});
check('moving a source away from the channels makes it hotter', () => {
  const s = D.PRESETS.inverter.state;
  const base = P2.evaluate(s).map.sources[0].Tj;
  const off = Object.assign({}, s, { sources: [Object.assign({}, s.sources[0], { x: 0.02, y: 0.02, w: 0.03, h: 0.03 })] });
  const one = Object.assign({}, s, { sources: [Object.assign({}, s.sources[0], { w: 0.03, h: 0.03 })] });
  assert.ok(P2.evaluate(off).map.sources[0].Tplate > P2.evaluate(one).map.sources[0].Tplate);
  assert.ok(isFinite(base));
});

console.log('Pump operating point');
const withPump = (pump) => Object.assign({}, D.PRESETS.inverter.state, { flowSource: 'pump', pump });
check('pump pressure = plate + loop pressure drop at the operating point', () => {
  const op = P.operatingPoint(withPump(D.DEFAULT_PUMP));
  assert.ok(op.ok, op.msg);
  near(op.dpPump, op.dpPlate + op.dpLoop, 1e-3 * op.dpPump);
});
check('pump curve interpolation and end of curve', () => {
  const pts = [[0, 100e3], [1e-3, 50e3], [2e-3, 0]];
  near(P.pumpDp(pts, 0.5e-3), 75e3, 1e-6); near(P.pumpDp(pts, 3e-3), 0, 1e-9);
});
check('stronger pump → more flow; extra loop resistance → less flow', () => {
  const base = P.operatingPoint(withPump(D.DEFAULT_PUMP)).q;
  const strong = P.operatingPoint(withPump(Object.assign({}, D.DEFAULT_PUMP, { points: D.PUMPS.industrial.points }))).q;
  const restrictive = P.operatingPoint(withPump(Object.assign({}, D.DEFAULT_PUMP, { extDp: 100e3 }))).q;
  assert.ok(strong > base && restrictive < base, `${strong} > ${base} > ${restrictive}`);
});
check('effective state uses the operating-point flow', () => {
  const s = withPump(D.DEFAULT_PUMP);
  const { s: eff, op } = P.effectiveState(s);
  assert.strictEqual(eff.flowMode, 'vol');
  near(eff.flow, op.q, 1e-15);
  near(P.solve(eff).dp, op.dpPlate, 1e-6 * op.dpPlate);
});
check('pump too weak is reported, not solved', () => {
  const op = P.operatingPoint(withPump({ points: [[0, 1], [1e-3, 0]], extDp: 0, extQ: 0 }));
  assert.ok(op.ok ? op.q < 1e-5 : true);
});

console.log('Manifold flow distribution');
const cu = (o) => P.solve(Object.assign({}, D.PRESETS.copper.state, o));
check('channel flows add up to the total flow', () => {
  const r = cu({ layout: 'parallelZ' });
  near(r.dist.q.reduce((a, q) => a + q, 0), r.mdot / r.props.rho, 1e-6 * r.mdot / r.props.rho);
});
check('U-type splits flow more evenly than Z-type (same plate)', () => {
  assert.ok(cu({ layout: 'parallelU' }).dist.cv < cu({ layout: 'parallelZ' }).dist.cv);
});
check('Z-type: far-end channel gets most flow; U-type: channel nearest the ports does', () => {
  const z = cu({ layout: 'parallelZ' }).dist, u = cu({ layout: 'parallelU' }).dist;
  assert.strictEqual(z.maxI, z.frac.length - 1);
  assert.strictEqual(u.maxI, 0);
});
check('very large headers give a nearly uniform split', () => {
  const r = cu({ layout: 'parallelZ', header: 0.03, headerDepth: 0.008, margin: 0.004 });
  assert.ok(r.dist.min > 0.9 && r.dist.max < 1.1, `${r.dist.min} … ${r.dist.max}`);
});
check('starved channels run hotter in the 2D model', () => {
  const { base, map } = P2.evaluate(Object.assign({}, D.PRESETS.copper.state, { layout: 'parallelZ' }));
  const outs = map.paths.map((p) => p.Tout);
  assert.ok(outs[base.dist.minI] > outs[base.dist.maxI]);
});

console.log('Fluids and TIMs');
check('every fluid solves and has physical properties at 20 °C', () => {
  for (const id of Object.keys(D.FLUIDS)) {
    const s = Object.assign({}, D.PRESETS.inverter.state, { fluid: id, heatArea: 'full' });
    if (D.FLUIDS[id].phase === 'gas') Object.assign(s, { flowMode: 'mass', flow: 0.003, pIn: 3e5 });
    const r = P.solve(s);
    assert.ok(r.ok, `${id}: ${r.issues.map((i) => i.msg).join('; ')}`);
    const p = P.fluidProps(id, 20, 3e5);
    assert.ok(p.rho > 0 && p.cp > 0 && p.k > 0 && p.mu > 0, id);
  }
});
check('helium and CO₂ densities at 20 °C, 1 atm', () => {
  near(P.fluidProps('he', 20, 101325).rho, 0.1664, 0.002);
  near(P.fluidProps('co2', 20, 101325).rho, 1.83, 0.02);
});
check('water outperforms dielectric fluids at the same flow', () => {
  const q = (f) => P.solve(Object.assign({}, D.PRESETS.inverter.state, { fluid: f, heatArea: 'full' })).Q;
  assert.ok(q('water') > q('hfe') && q('water') > q('pao'));
});
check('custom liquid uses the entered properties', () => {
  const cf = { rho: 900, cp: 2000, k: 0.2, mu: 0.01, freeze: -50, boil: 200 };
  const r = P.solve(Object.assign({}, D.PRESETS.inverter.state, { fluid: 'custom', customFluid: cf, heatArea: 'full' }));
  near(r.props.rho, 900, 1e-9); near(r.props.cp, 2000, 1e-9); near(r.props.mu, 0.01, 1e-12); near(r.Tboil, 200, 1e-9);
});
check('TIM library: thick gap pad has far more resistance than solder', () => {
  const z = (t) => t.t / t.k + t.rc;
  assert.ok(z(D.TIMS.gappad) > 20 * z(D.TIMS.solder));
});
check('a thicker TIM raises the junction temperature by the extra P·t/(k·A)', () => {
  const s = D.PRESETS.inverter.state;
  const thick = Object.assign({}, s, { sources: s.sources.map((x) => Object.assign({}, x, { tim: x.tim + 1e-4 })) });
  const a = P2.evaluate(s).map.sources[0], b = P2.evaluate(thick).map.sources[0];
  const src = s.sources[0];
  near(b.Tcase - b.Tplate - (a.Tcase - a.Tplate), src.P * 1e-4 / (src.kTim * src.w * src.h), 1e-9);
});

console.log('Calculation steps');
const S = require('../js/steps.js');
const stepKeys = new Set();
const recT = (k, p) => { stepKeys.add(k); return P.fill(k, p); };
check('step-by-step values reproduce the solver for every preset and variant', () => {
  const P2s = require('../js/physics2d.js');
  for (const [id, p] of Object.entries(D.PRESETS)) {
    const variants = [p.state,
      Object.assign({}, p.state, { layout: 'serpentine', heatArea: 'full', mode: 'capacity' }),
      Object.assign({}, p.state, { flow: p.state.flow * 2.2 }),
      Object.assign({}, p.state, { shape: 'round', flow: p.state.flow * 4 })];
    for (const s0 of variants) {
      const eff = P.effectiveState(s0, {});
      const { base: res, map } = P2s.evaluate(eff.s, {});
      if (!res.ok) continue;
      const v = S.build(eff.s, res, map, eff.op, { t: recT }).values;
      const cmp = { Dh: res.geometry.Dh, Re: res.Re, Nu: res.Nu, h: res.h, eta: res.eta, Rth: res.Rth, Tout: res.Tout, f: res.f };
      if (v.Q !== undefined) cmp.Q = res.Q;
      if (v.TsMax !== undefined) cmp.TsMax = res.TsMax;
      if (eff.s.layout === 'serpentine') cmp.dp = res.dp;
      if (v.Tj !== undefined) cmp.Tj = Math.max(...map.sources.map((r) => r.Tj));
      for (const k in cmp) near(v[k] / cmp[k], 1, 1e-6, `${id} ${k}`);
    }
  }
});
check('formula markup renders to HTML and plain text', () => {
  assert.strictEqual(S.toHtml('D_{h} = 4·A^{2}'), 'D<sub>h</sub> = 4·A<sup>2</sup>');
  assert.strictEqual(S.toText('D_{h} = 10^{−3}·Gz^{2/3}'), 'Dh = 10⁻³·Gz^(2/3)');
});

console.log('Design studies');
const ST = require('../js/study.js');
check('sweep values: evenly spaced, integers rounded, current value included and sorted', () => {
  assert.deepStrictEqual(ST.sweepValues(10, 20, 3, false, 12), [10, 12, 15, 20]);
  assert.deepStrictEqual(ST.sweepValues(20, 10, 3, false, 25), [10, 15, 20]);
  assert.deepStrictEqual(ST.sweepValues(4, 10, 4, true, 6), [4, 6, 8, 10]);
});
check('applying a parameter changes only that input (power scale multiplies every source)', () => {
  const s = D.PRESETS.inverter.state;
  const a = ST.applyParam(s, 'cw', 0.002);
  assert.strictEqual(a.cw, 0.002); assert.strictEqual(s.cw, D.PRESETS.inverter.state.cw);
  const b = ST.applyParam(s, 'pscale', 2);
  b.sources.forEach((x, i) => near(x.P, 2 * s.sources[i].P, 1e-9));
  assert.strictEqual(ST.applyParam(s, 'count', 7.6).count, 8);
});
check('every sweepable parameter reproduces the design at its current value', () => {
  for (const [id, p] of Object.entries(D.PRESETS)) {
    const base = ST.metrics(ST.evaluateDesign(p.state));
    assert.ok(base.ok, id);
    for (const par of ST.paramsFor(p.state)) {
      const m = ST.metrics(ST.evaluateDesign(ST.applyParam(p.state, par.key, ST.paramValue(p.state, par.key))));
      near(m.headline / base.headline, 1, 1e-9, `${id} ${par.key}`);
    }
  }
});
check('more flow lowers the hottest temperature and raises the pressure drop', () => {
  for (const id of ['inverter', 'battery', 'gpu']) {
    const s = D.PRESETS[id].state;
    const lo = ST.metrics(ST.evaluateDesign(ST.applyParam(s, 'flow', s.flow * 0.6), { maxCells: 2500 }));
    const hi = ST.metrics(ST.evaluateDesign(ST.applyParam(s, 'flow', s.flow * 1.6), { maxCells: 2500 }));
    assert.ok(hi.headline < lo.headline && hi.dp > lo.dp, id);
  }
});
check('a hotter inlet lowers the capacity of a plate at a fixed surface limit', () => {
  const s = Object.assign({}, D.PRESETS.fuelcell.state, { heatArea: 'full', mode: 'capacity' });
  const a = ST.metrics(ST.evaluateDesign(ST.applyParam(s, 'Tin', s.Tin - 10), { maxCells: 2500 }));
  const b = ST.metrics(ST.evaluateDesign(ST.applyParam(s, 'Tin', s.Tin + 10), { maxCells: 2500 }));
  assert.ok(a.kind === 'q' && a.Q > b.Q);
});
check('invalid variants are reported, not thrown', () => {
  const m = ST.metrics(ST.evaluateDesign(ST.applyParam(D.PRESETS.inverter.state, 'count', 500)));
  assert.strictEqual(m.ok, false);
});
check('CSV quoting', () => assert.strictEqual(ST.toCsv([['a,b', 'c"d', 1.5]]), '"a,b","c""d",1.5'));
const solveOpt = (s, key, target, dpMax) => {
  const o = ST.SOLVE_FOR.find((x) => x.key === key);
  return ST.solveTarget(s, { key, dir: o.dir, log: o.log, int: o.int, range: o.range(ST.paramValue(s, key)), target, dpMax: dpMax || null });
};
check('minimum flow meets the component margin, and 1 % less flow does not', () => {
  const s = D.PRESETS.inverter.state;
  const r = solveOpt(s, 'flow', { type: 'margin', value: 5 });
  assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.limitedBy, 'thermal');
  assert.ok(r.sol.m.margin >= 5 && r.sol.m.margin < 6, `margin ${r.sol.m.margin}`);
  const less = ST.metrics(ST.evaluateDesign(ST.applyParam(s, 'flow', r.sol.x * 0.99)));
  assert.ok(less.margin < 5 + 0.3);
});
check('highest inlet temperature for a peak surface limit (uniform heat)', () => {
  const s = Object.assign({}, D.PRESETS.battery.state, { heatArea: 'full', mode: 'load', Q: 400 });
  const r = solveOpt(s, 'Tin', { type: 'tmax', value: 45 });
  assert.strictEqual(r.status, 'ok');
  near(r.sol.m.Tpeak, 45, 0.3, 'peak at the solution');
});
check('fewest channels: integer answer, one fewer misses the target', () => {
  const s = D.PRESETS.inverter.state;
  const r = solveOpt(s, 'count', { type: 'margin', value: 20 });
  assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.sol.x, Math.round(r.sol.x));
  const fewer = ST.metrics(ST.evaluateDesign(ST.applyParam(s, 'count', r.sol.x - 1)));
  assert.ok(!fewer.ok || fewer.margin < 20);
});
check('capacity target: minimum flow to dissipate a heat load at the surface limit', () => {
  const s = Object.assign({}, D.PRESETS.fuelcell.state, { heatArea: 'full', mode: 'capacity' });
  const base = ST.metrics(ST.evaluateDesign(s));
  const r = solveOpt(s, 'flow', { type: 'q', value: base.Q * 0.8 });
  assert.strictEqual(r.status, 'ok'); assert.ok(r.sol.x < s.flow && r.sol.m.Q >= base.Q * 0.8);
});
check('a pressure-drop limit that conflicts with the thermal target is reported', () => {
  const r = solveOpt(D.PRESETS.inverter.state, 'flow', { type: 'margin', value: 5 }, 100);
  assert.strictEqual(r.status, 'none'); assert.strictEqual(r.thermalReachable, true);
});

console.log('Transient');
const P2t = require('../js/physics2d.js');
const TR = require('../js/transient.js');
const loadState = (s, Q) => Object.assign({}, s, { mode: 'load', Q });
const designQ = (s) => (s.heatArea === 'sources' ? s.sources.reduce((a, x) => a + x.P, 0) : 3000);
check('time steps grow geometrically and add up to the duration', () => {
  const d = P2t.stepSizes(60, 40, 1e-3);
  near(d.reduce((a, v) => a + v, 0), 60, 1e-9); near(d[0], 0.06, 1e-9);
  for (let i = 1; i < d.length - 1; i++) assert.ok(d[i] > d[i - 1]);
});
check('energy is conserved: heat in − heat out = heat stored (all presets)', () => {
  for (const [id, p] of Object.entries(D.PRESETS)) {
    const s = loadState(P.effectiveState(p.state, {}).s, designQ(p.state));
    const base = P.solve(s, {});
    const h = P2t.runTransient(s, base, { f0: 0.5, segments: [{ dur: 30, f: 1.5, n: 30, first: 1e-3 }, { dur: 30, f: 0.2, n: 30, first: 1e-3 }] }, { maxCells: 1200 });
    let net = 0;
    for (let i = 1; i < h.t.length; i++) net += (h.t[i] - h.t[i - 1]) * (h.Pin[i] - h.Pout[i]);
    const dE = h.E[h.E.length - 1] - h.E[0];
    near(net / dE, 1, 1e-4, id);
  }
});
check('a long step settles at the steady 2D solution', () => {
  const s = loadState(D.PRESETS.inverter.state, designQ(D.PRESETS.inverter.state));
  const base = P.solve(s, {});
  const h = P2t.runTransient(s, base, { f0: 1, segments: [{ dur: 600, f: 1.5, n: 80, first: 1e-4 }] }, { maxCells: 1200 });
  h.src.forEach((y, i) => near(y[y.length - 1], h.steady[1.5].src[i], 0.05, 'source ' + i));
  // Steady start equals the steady model at factor 1.
  h.src.forEach((y, i) => near(y[0], h.steady[1].src[i], 1e-6));
});
check('nearly isothermal plate follows the lumped first-order response (63 % at t = RC)', () => {
  const s = loadState(Object.assign({}, D.PRESETS.fuelcell.state, { heatArea: 'full', material: 'custom', kCustom: 2e5, rhoCustom: 2700, cpCustom: 900 }), 2000);
  const base = P.solve(s, {});
  const probe = P2t.runTransient(s, base, { f0: 0, segments: [{ dur: 1, f: 0, n: 1, first: 1 }] }, { maxCells: 1200 });
  const st = P2t.runTransient(s, base, { f0: 1, segments: [{ dur: 1, f: 1, n: 1, first: 1 }] }, { maxCells: 1200 });
  const rise = st.Tmax[0] - s.Tin;
  const tau = probe.Cplate * rise / 2000;
  const h = P2t.runTransient(s, base, { f0: 0, segments: [{ dur: tau, f: 1, n: 200, first: 1e-3 }] }, { maxCells: 1200 });
  near((h.Tmax[h.Tmax.length - 1] - s.Tin) / rise, 1 - Math.exp(-1), 0.02);
});
check('component heat capacity slows the junction rise and the steady state is unchanged', () => {
  const s0 = loadState(D.PRESETS.battery.state, designQ(D.PRESETS.battery.state));
  const noMass = Object.assign({}, s0, { sources: s0.sources.map((x) => Object.assign({}, x, { cth: 0 })) });
  const prof = { f0: 0, segments: [{ dur: 120, f: 1, n: 60, first: 1e-3 }] };
  const a = P2t.runTransient(s0, P.solve(s0, {}), prof, { maxCells: 1200 });
  const b = P2t.runTransient(noMass, P.solve(noMass, {}), prof, { maxCells: 1200 });
  assert.ok(a.src[0][a.t.length - 1] < b.src[0][b.t.length - 1] - 0.5);
  near(a.steady[1].src[0], b.steady[1].src[0], 1e-9);
});
check('limit crossing time and pulse profile', () => {
  near(TR.crossing([0, 1, 2], [10, 20, 30], 25), 1.5, 1e-12);
  assert.strictEqual(TR.crossing([0, 1], [10, 20], 50), null);
  const pr = TR.buildProfile({ kind: 'pulse', pf0: 1, pf1: 3, per: 2, duty: 25, cyc: 5 });
  assert.strictEqual(pr.segments.length, 10);
  near(pr.segments[0].dur, 0.5, 1e-12); near(pr.segments[1].dur, 1.5, 1e-12);
});

console.log('Translations');
const I18N = require('../js/i18n.js');
const fs = require('fs');
const path = require('path');
const KEYS = new Set(I18N.keys());
check('every dictionary row has English, German, Dutch and Turkish with matching placeholders', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const row of I18N.rows()) {
    assert.strictEqual(row.length, 4, row[0]);
    row.forEach((v) => assert.ok(typeof v === 'string' && v.length, row[0]));
    row.slice(1).forEach((v) => assert.strictEqual(ph(v), ph(row[0]), `placeholders in "${row[0]}"`));
  }
});
check('all data names (presets, materials, fluids, pumps, TIMs) are translated', () => {
  const miss = [];
  for (const col of [D.PRESETS, D.MATERIALS, D.FLUIDS, D.PUMPS, D.TIMS]) for (const v of Object.values(col)) if (!KEYS.has(v.name)) miss.push(v.name);
  for (const g of new Set(Object.values(D.PRESET_GROUPS))) if (!KEYS.has(g)) miss.push(g);
  for (const [id, p] of Object.entries(D.PRESETS)) if (!p.group) miss.push('group of ' + id);
  assert.deepStrictEqual(miss, []);
});
check('every literal t(...) key and solver message template is translated', () => {
  const miss = new Set();
  const need = (k) => { if (k && !KEYS.has(k)) miss.add(k); };
  for (const f of ['app.js', 'report.js', 'drawing.js', 'charts.js', 'study.js', 'transient.js']) {
    const src = fs.readFileSync(path.join(__dirname, '../js', f), 'utf8');
    for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) need(m[1].replace(/\\'/g, "'"));
  }
  const phys = fs.readFileSync(path.join(__dirname, '../js/physics.js'), 'utf8');
  for (const m of phys.matchAll(/(?:\bM|add)\('(?:error|warn|info)', (?:[^']*\? )?'([^']+)'(?: : '([^']+)')?/g)) { need(m[1]); need(m[2]); }
  for (const m of phys.matchAll(/msg: '([^']+)'/g)) need(m[1]);
  for (const k of stepKeys) need(k);
  for (const o of ST.SOLVE_FOR) {
    if (typeof o.label === 'string') need(o.label);
    else { need(o.label({ layout: 'serpentine' })); need(o.label({ layout: 'parallelZ' })); }
  }
  for (const k of ['Margin below each component limit', 'Max. peak surface temperature', 'Heat to dissipate']) need(k);
  for (const par of ST.PARAMS) {
    if (typeof par.label === 'string') need(par.label);
    else { need(par.label({ layout: 'serpentine' })); need(par.label({ layout: 'parallelZ' })); }
  }
  for (const k of ['Hottest junction', 'Max. heat dissipation', 'Peak surface temperature', 'Total heat', 'Margin to limit', 'Power headroom',
    'Peak plate surface', 'Plate temperature spread', 'Coolant outlet', 'Volume flow (mean)', 'Pressure drop', 'Hydraulic pump power', 'Channel velocity',
    'Reynolds number', 'Heat transfer coeff.', 'Lowest channel flow', 'Plate mass (dry)', 'Coolant volume', 'Application', 'Plate', 'Material',
    'Flow layout', 'Channels', 'Coolant', 'Inlet temperature', 'Flow', 'Heat input', 'Serpentine', 'Parallel · Z', 'Parallel · U']) need(k);
  assert.deepStrictEqual([...miss], []);
});
check('t() fills placeholders and translates names passed as parameters', () => {
  assert.strictEqual(I18N.t('Source {n}', { n: 3 }), 'Source 3');
});

console.log('Units');
check('1 gpm = 3.785 L/min', () => near(U.fromDisplay('volflow', 1, 'IMP') * 60e3, 3.78541, 1e-4));
check('100 °C = 212 °F, round trip', () => { near(U.toDisplay('temp', 100, 'IMP'), 212, 1e-9); near(U.fromDisplay('temp', 212, 'IMP'), 100, 1e-9); });
check('1 SCFM ≈ 26.4 SLPM (different reference temperatures)', () => {
  const mol = U.fromDisplay('stdflow', 1, 'IMP'); near(U.toDisplay('stdflow', mol, 'SI'), 26.38, 0.05);
});
check('1 BTU/h·ft²·°F = 5.678 W/m²K', () => near(U.fromDisplay('htc', 1, 'IMP'), 5.678, 0.001));

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
