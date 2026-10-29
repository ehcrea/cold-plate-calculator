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
check('source: junction > case > plate, TIM drop = P·t/(k·A)', () => {
  const { map } = P2.evaluate(D.PRESETS.inverter.state);
  const src = D.PRESETS.inverter.state.sources[0], r = map.sources[0];
  assert.ok(r.Tj > r.Tcase && r.Tcase > r.Tplate);
  near(r.Tcase - r.Tplate, src.P * src.tim / (src.kTim * src.w * src.h), 1e-9);
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

console.log('Units');
check('1 gpm = 3.785 L/min', () => near(U.fromDisplay('volflow', 1, 'IMP') * 60e3, 3.78541, 1e-4));
check('100 °C = 212 °F, round trip', () => { near(U.toDisplay('temp', 100, 'IMP'), 212, 1e-9); near(U.fromDisplay('temp', 212, 'IMP'), 100, 1e-9); });
check('1 SCFM ≈ 26.4 SLPM (different reference temperatures)', () => {
  const mol = U.fromDisplay('stdflow', 1, 'IMP'); near(U.toDisplay('stdflow', mol, 'SI'), 26.38, 0.05);
});
check('1 BTU/h·ft²·°F = 5.678 W/m²K', () => near(U.fromDisplay('htc', 1, 'IMP'), 5.678, 0.001));

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
