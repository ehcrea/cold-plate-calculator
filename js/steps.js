/*
 * Step-by-step calculation: the 1D model written out as formulas with the
 * current design's numbers substituted, for checking by hand and teaching.
 *
 * Every value is recomputed here from the formula shown (SI units), so the
 * page shows exactly what the formula gives; tests compare these values with
 * the solver. Formulas use a small markup: _{sub} and ^{sup}.
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const Physics = isNode ? require('./physics.js') : root.Physics;
  const Data = isNode ? require('./data.js') : root.CPData;
  const RE_LAM = 2300, RE_TURB = 4000;

  /** Number with ~4 significant digits; very small/large values as m·10^{e}. */
  function numFmt(locale) {
    return (v, sig = 4) => {
      if (v === null || v === undefined || !isFinite(v)) return '—';
      if (v === 0) return '0';
      const a = Math.abs(v);
      const f = (x) => x.toLocaleString(locale, { maximumSignificantDigits: sig });
      if (a >= 1e-3 && a < 1e6) return f(v);
      const e = Math.floor(Math.log10(a));
      return `${f(v / 10 ** e)}·10^{${String(e).replace('-', '−')}}`;
    };
  }

  /**
   * Build the calculation for the current design.
   * s: state used for the calculation; res: 1D result (Physics.solve); map: 2D result or null;
   * op: pump operating point or null. opts: { t, locale, format(q, si) }.
   */
  function build(s, res, map, op, opts = {}) {
    const t = opts.t || ((x, p) => Physics.fill(x, p));
    const n = numFmt(opts.locale || 'en-US');
    const disp = opts.format || null;
    // Result with SI unit, plus the displayed unit when it differs.
    const R = (v, unit, q) => {
      const si = `${n(v)} ${unit}`.trim();
      if (!disp || !q) return si;
      const d = disp(q, v);
      const norm = (x) => x.replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³').replace(/[\s()]/g, '');
      return d && norm(d) !== norm(si) ? `${si} (${d})` : si;
    };

    const g = res.geometry, pr = res.props;
    const fluid = Data.FLUIDS[s.fluid];
    const mat = Data.MATERIALS[s.material];
    const ks = res.ks;
    const serp = s.layout === 'serpentine';
    const sections = [];
    const values = {}; // recomputed values, for tests
    let list;
    const section = (title, intro) => { list = []; sections.push({ title: t(title), intro: intro || '', steps: list }); };
    // Constants inside formulas follow the locale's decimal separator, like the substituted numbers.
    const comma = (1.5).toLocaleString(opts.locale || 'en-US').charAt(1) === ',';
    const loc = (str) => (comma ? str.replace(/(\d)\.(\d)/g, '$1,$2') : str);
    // title: English key, or [key, params].
    const step = (title, f, sub, r, note) => list.push({ title: Array.isArray(title) ? t(...title) : t(title), f: loc(f), sub: sub || '', r: r || '', note: note || '' });

    // ---------- 1. Geometry ----------
    section('Channel geometry');
    let A, P;
    if (s.shape === 'round') {
      A = Math.PI * g.a ** 2 / 4; P = Math.PI * g.a;
      step('Flow area and wetted perimeter', 'A = π·D^{2} / 4,   P = π·D',
        `A = π·${n(g.a)}^{2} / 4,   P = π·${n(g.a)}`, `A = ${R(A, 'm^{2}')},   P = ${R(P, 'm')}`);
    } else {
      A = g.a * g.b; P = 2 * (g.a + g.b);
      step('Flow area and wetted perimeter', 'A = a·b,   P = 2·(a + b)',
        `A = ${n(g.a)}·${n(g.b)},   P = 2·(${n(g.a)} + ${n(g.b)})`, `A = ${R(A, 'm^{2}')},   P = ${R(P, 'm')}`,
        t('a = channel width, b = channel depth.'));
    }
    const Dh = 4 * A / P;
    values.Dh = Dh;
    step('Hydraulic diameter', 'D_{h} = 4·A / P', `D_{h} = 4·${n(A)} / ${n(P)}`, `D_{h} = ${R(Dh, 'm', 'length')}`);
    const alpha = Math.min(g.a, g.b) / Math.max(g.a, g.b);
    if (s.shape !== 'round') step('Aspect ratio', 'α = min(a, b) / max(a, b)', `α = ${n(Math.min(g.a, g.b))} / ${n(Math.max(g.a, g.b))}`, `α = ${n(alpha, 3)}`);
    const pitch = (g.span - 2 * s.margin) / g.nRuns, web = pitch - g.a;
    step('Channel pitch and wall', 'p = (S − 2·e) / n_{runs},   t_{web} = p − a',
      `p = (${n(g.span)} − 2·${n(s.margin)}) / ${g.nRuns},   t_{web} = ${n(pitch)} − ${n(g.a)}`,
      `p = ${R(pitch, 'm', 'length')},   t_{web} = ${R(web, 'm', 'length')}`,
      t('S = plate size across the channels, e = edge margin.'));
    let Lch;
    if (serp) {
      Lch = g.count * g.straight + g.nBends * Math.PI * g.bendRadius;
      step('Channel length', 'L_{ch} = n·L_{s} + (n − 1)·π·r_{b}',
        `L_{ch} = ${g.count}·${n(g.straight)} + ${g.nBends}·π·${n(g.bendRadius)}`, `L_{ch} = ${R(Lch, 'm', 'length')}`,
        t('n = passes per circuit, L_{s} = straight pass length, r_{b} = bend radius.'));
    } else {
      Lch = g.run - 2 * s.margin - 2 * s.header;
      step('Channel length', 'L_{ch} = L_{run} − 2·e − 2·w_{h}',
        `L_{ch} = ${n(g.run)} − 2·${n(s.margin)} − 2·${n(s.header)}`, `L_{ch} = ${R(Lch, 'm', 'length')}`,
        t('w_{h} = header width.'));
    }
    values.Lch = Lch;

    // ---------- 2. Coolant ----------
    section('Coolant properties and flow');
    const Tm = (res.Tin + res.Tout) / 2;
    step('Mean coolant temperature', 'T_{m} = (T_{in} + T_{out}) / 2', `T_{m} = (${n(res.Tin)} + ${n(res.Tout)}) / 2`, `T_{m} = ${R(Tm, '°C', 'temp')}`,
      t('Properties are evaluated at T_{m}; T_{out} comes from the energy balance below, so the solver iterates.'));
    step(['Properties of {fluid} at T_{m}', { fluid: fluid.name }], 'ρ, c_{p}, μ, k = f(T_{m}, p)', '',
      `ρ = ${n(pr.rho)} kg/m^{3},   c_{p} = ${n(pr.cp)} J/(kg·K),   μ = ${n(pr.mu)} Pa·s,   k = ${n(pr.k)} W/(m·K)`);
    const Pr = pr.cp * pr.mu / pr.k;
    values.Pr = Pr;
    step('Prandtl number', 'Pr = c_{p}·μ / k', `Pr = ${n(pr.cp)}·${n(pr.mu)} / ${n(pr.k)}`, `Pr = ${n(Pr, 3)}`);

    const mdot = res.mdot;
    if (op && op.ok) {
      step('Pump operating point', 'Δp_{pump}(V̇) = Δp_{plate}(V̇) + Δp_{loop,ref}·(V̇ / V̇_{ref})^{2}', '',
        `V̇ = ${R(op.q, 'm^{3}/s', 'volflow')},   Δp = ${R(op.dpPump, 'Pa', 'dpressure')}`,
        t('Solved numerically (bisection) where the pump curve meets the system curve.'));
    }
    if (s.flowMode === 'vol') {
      step('Mass flow', 'ṁ = ρ_{in}·V̇', `ṁ = ${n(res.propsIn.rho)}·${n(s.flow)}`, `ṁ = ${R(mdot, 'kg/s', 'massflow')}`, t('Density at the inlet temperature.'));
    } else if (s.flowMode === 'std') {
      step('Mass flow', 'ṁ = ṅ·M', `ṁ = ${n(s.flow)}·${n(fluid.M)}`, `ṁ = ${R(mdot, 'kg/s', 'massflow')}`, t('Standard flow converted to molar flow ṅ; M = molar mass.'));
    } else {
      step('Mass flow', 'ṁ', '', `ṁ = ${R(mdot, 'kg/s', 'massflow')}`);
    }
    const mch = mdot / g.nPar;
    step('Flow per channel', 'ṁ_{ch} = ṁ / n_{par}', `ṁ_{ch} = ${n(mdot)} / ${g.nPar}`, `ṁ_{ch} = ${R(mch, 'kg/s')}`,
      serp ? t('Serpentine: each circuit carries an equal share.') : t('Average channel; the manifold model below gives the real split.'));
    const v = mch / (pr.rho * A);
    values.v = v;
    step('Channel velocity', 'v = ṁ_{ch} / (ρ·A)', `v = ${n(mch)} / (${n(pr.rho)}·${n(A)})`, `v = ${R(v, 'm/s', 'velocity')}`);
    const Re = pr.rho * v * Dh / pr.mu;
    values.Re = Re;
    const regime = Re <= RE_LAM ? 'Laminar' : Re >= RE_TURB ? 'Turbulent' : 'Transitional';
    step('Reynolds number', 'Re = ρ·v·D_{h} / μ', `Re = ${n(pr.rho)}·${n(v)}·${n(Dh)} / ${n(pr.mu)}`, `Re = ${n(Re, 4)}  →  ${t(regime)}`,
      t('Laminar below 2300, turbulent above 4000, blended in between.'));
    if (pr.phase === 'gas') {
      step('Mach number', 'Ma = v / c', `Ma = ${n(v)} / ${n(pr.sound)}`, `Ma = ${n(v / pr.sound, 3)}`, t('Compressibility is negligible below Ma ≈ 0.3.'));
    }

    // ---------- 3. Heat transfer ----------
    section('Heat transfer coefficient');
    const Ls = Math.max(g.straight, g.Dh);
    const fd = Physics.laminarFD(s.shape, alpha);
    const lamNu = (re) => {
      const Gz = Dh * re * Pr / Ls;
      return { Gz, Nu: fd.Nu + 0.0668 * Gz / (1 + 0.04 * Math.pow(Gz, 2 / 3)) };
    };
    const turb = (re) => {
      const f = Math.pow(-1.8 * Math.log10(Math.pow(s.roughness / Dh / 3.7, 1.11) + 6.9 / re), -2);
      const Nu0 = (f / 8) * (re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2 / 3) - 1));
      return { f, Nu0, Nu: Nu0 * (1 + Math.pow(Dh / Ls, 2 / 3)) };
    };
    let Nu;
    const showLam = (re, label) => {
      if (s.shape === 'round') step('Fully developed laminar Nu', 'Nu_{fd} = 4.364', '', `Nu_{fd} = 4.364`, t('Circular tube, constant heat flux (H1).'));
      else step('Fully developed laminar Nu', 'Nu_{fd} = 8.235·(1 − 2.0421α + 3.0853α^{2} − 2.4765α^{3} + 1.0578α^{4} − 0.1861α^{5})',
        `α = ${n(alpha, 3)}`, `Nu_{fd} = ${n(fd.Nu)}`, t('Shah & London, rectangular duct, constant heat flux (H1).'));
      const L = lamNu(re);
      step('Thermal entry length correction', 'Gz = D_{h}·Re·Pr / L_{s},   Nu = Nu_{fd} + 0.0668·Gz / (1 + 0.04·Gz^{2/3})',
        `Gz = ${n(Dh)}·${n(re)}·${n(Pr)} / ${n(Ls)}`, `Gz = ${n(L.Gz)},   Nu${label} = ${n(L.Nu)}`,
        t('Hausen form, averaged over one straight pass L_{s}.'));
      return L.Nu;
    };
    const showTurb = (re, label) => {
      const T = turb(re);
      step('Turbulent friction factor (Haaland)', 'f = [−1.8·log_{10}((ε_{r}/D_{h} / 3.7)^{1.11} + 6.9 / Re)]^{−2}',
        `ε_{r} = ${n(s.roughness)},   Re = ${n(re)}`, `f = ${n(T.f)}`, t('ε_{r} = surface roughness.'));
      step('Gnielinski correlation', 'Nu = (f/8)·(Re − 1000)·Pr / (1 + 12.7·√(f/8)·(Pr^{2/3} − 1)) · (1 + (D_{h}/L_{s})^{2/3})',
        `f = ${n(T.f)},   Re = ${n(re)},   Pr = ${n(Pr)}`, `Nu${label} = ${n(T.Nu)}`, t('Last factor: short-duct entry correction.'));
      return T.Nu;
    };
    if (regime === 'Laminar') Nu = showLam(Re, '');
    else if (regime === 'Turbulent') Nu = showTurb(Re, '');
    else {
      const a = showLam(RE_LAM, '(2300)'), b = showTurb(RE_TURB, '(4000)');
      const x = (Re - RE_LAM) / (RE_TURB - RE_LAM);
      Nu = a + x * (b - a);
      step('Transitional blend', 'x = (Re − 2300) / 1700,   Nu = Nu(2300) + x·(Nu(4000) − Nu(2300))',
        `x = (${n(Re)} − 2300) / 1700`, `x = ${n(x, 3)},   Nu = ${n(Nu)}`);
    }
    values.Nu = Nu;
    const h = Nu * pr.k / Dh;
    values.h = h;
    step('Heat transfer coefficient', 'h = Nu·k / D_{h}', `h = ${n(Nu)}·${n(pr.k)} / ${n(Dh)}`, `h = ${R(h, 'W/(m^{2}·K)', 'htc')}`);
    const finH = s.shape === 'round' ? g.a / 2 : g.b;
    const mFin = Math.sqrt(2 * h / (ks * web));
    const eta = mFin * finH > 1e-9 ? Math.tanh(mFin * finH) / (mFin * finH) : 1;
    values.eta = eta;
    step('Fin efficiency of the channel walls', 'm = √(2·h / (k_{s}·t_{web})),   η_{f} = tanh(m·H) / (m·H)',
      `m = √(2·${n(h)} / (${n(ks)}·${n(web)})),   H = ${n(finH)}`, `m = ${n(mFin)} 1/m,   η_{f} = ${n(eta, 3)}`,
      t('The walls between channels act as fins of height H, cooled on both faces; k_{s} = plate conductivity ({mat}).', { mat: s.material === 'custom' ? t('Custom') : mat.name }));
    let Peff;
    if (s.shape === 'round') {
      Peff = Math.PI * g.a * (0.5 + 0.5 * eta);
      step('Effective wetted perimeter', 'P_{eff} = π·D·(0.5 + 0.5·η_{f})', `P_{eff} = π·${n(g.a)}·(0.5 + 0.5·${n(eta, 3)})`, `P_{eff} = ${R(Peff, 'm')}`);
    } else {
      Peff = g.a + 2 * g.b * eta + g.a * eta * eta;
      step('Effective wetted perimeter', 'P_{eff} = a + 2·b·η_{f} + a·η_{f}^{2}', `P_{eff} = ${n(g.a)} + 2·${n(g.b)}·${n(eta, 3)} + ${n(g.a)}·${n(eta, 3)}^{2}`, `P_{eff} = ${R(Peff, 'm')}`,
        t('Heated floor, two fin-effective side walls and the far wall (reached through two fins).'));
    }
    const Aeff = g.nPar * Peff * Lch;
    values.Aeff = Aeff;
    step('Effective heat transfer area', 'A_{eff} = n_{par}·P_{eff}·L_{ch}', `A_{eff} = ${g.nPar}·${n(Peff)}·${n(Lch)}`, `A_{eff} = ${R(Aeff, 'm^{2}', 'area')}`);

    // ---------- 4. Thermal resistance network ----------
    section('Thermal resistance network');
    const C = mdot * pr.cp;
    const Rconv = 1 / (h * Aeff);
    step('Convection resistance', 'R_{conv} = 1 / (h·A_{eff})', `R_{conv} = 1 / (${n(h)}·${n(Aeff)})`, `R_{conv} = ${R(Rconv, 'K/W')}`);
    const Rcap = 1 / C;
    step('Coolant heat capacity resistance', 'R_{cap} = 1 / (ṁ·c_{p})', `R_{cap} = 1 / (${n(mdot)}·${n(pr.cp)})`, `R_{cap} = ${R(Rcap, 'K/W')}`,
      t('Coolant temperature rise per watt.'));
    const NTU = Rcap / Rconv, eps = 1 - Math.exp(-NTU);
    step('NTU and effectiveness', 'NTU = R_{cap} / R_{conv},   ε = 1 − e^{−NTU}', `NTU = ${n(Rcap)} / ${n(Rconv)}`, `NTU = ${n(NTU, 3)},   ε = ${n(eps, 3)}`);
    const Rwall = s.wallHeated / (ks * g.heatArea);
    step('Heated-face wall conduction', 'R_{wall} = t_{w} / (k_{s}·A_{heat})', `R_{wall} = ${n(s.wallHeated)} / (${n(ks)}·${n(g.heatArea)})`, `R_{wall} = ${R(Rwall, 'K/W')}`);
    const sEdge = s.heatArea === 'full' ? s.margin : 0;
    const sMax = Math.max(web / 2, sEdge);
    const Rspread = sMax * sMax / (2 * ks * s.t * g.heatArea);
    step('Spreading to the channels', 'R_{spread} = s^{2} / (2·k_{s}·t·A_{heat}),   s = max(t_{web}/2, e_{heated})',
      `R_{spread} = ${n(sMax)}^{2} / (2·${n(ks)}·${n(s.t)}·${n(g.heatArea)})`, `R_{spread} = ${R(Rspread, 'K/W')}`,
      t('Heat that lands above a wall or an uncooled edge must travel sideways a distance s.'));
    const Llat = serp ? g.span : g.run, Blat = serp ? g.run : g.span;
    const Rlat = Llat / (8 * ks * s.t * Blat);
    const w = Rlat / (Rlat + Rcap);
    step('Lateral conduction weight', 'R_{lat} = L / (8·k_{s}·t·B),   w = R_{lat} / (R_{lat} + R_{cap})',
      `R_{lat} = ${n(Llat)} / (8·${n(ks)}·${n(s.t)}·${n(Blat)})`, `R_{lat} = ${R(Rlat, 'K/W')},   w = ${n(w, 3)}`,
      t('w = 1: plate cannot even out the coolant temperature rise (uniform heat flux); w = 0: isothermal plate.'));
    const Ruf = Rcap + Rconv + Rwall + Rspread;
    const Riso = Rcap / eps + Rwall + Rspread;
    const Rth = w * Ruf + (1 - w) * Riso;
    values.Rth = Rth;
    step('Total thermal resistance', 'R_{uf} = R_{cap} + R_{conv} + R_{wall} + R_{spread},   R_{iso} = R_{cap}/ε + R_{wall} + R_{spread},   R_{th} = w·R_{uf} + (1 − w)·R_{iso}',
      `R_{uf} = ${n(Ruf)},   R_{iso} = ${n(Riso)}`, `R_{th} = ${R(Rth, 'K/W', 'rth')}`,
      t('Peak heated surface to coolant inlet.'));
    const load = s.heatArea === 'sources' || s.mode !== 'capacity';
    let Q;
    if (load) {
      Q = s.heatArea === 'sources' ? (s.sources || []).reduce((a, x) => a + x.P, 0) : s.Q;
      const Ts = s.Tin + Q * Rth;
      values.TsMax = Ts;
      step('Peak surface temperature (1D)', 'T_{s,max} = T_{in} + Q·R_{th}', `T_{s,max} = ${n(s.Tin)} + ${n(Q)}·${n(Rth)}`, `T_{s,max} = ${R(Ts, '°C', 'temp')}`);
    } else {
      Q = (s.TsMax - s.Tin) / Rth;
      values.Q = Q;
      step('Heat dissipation capacity (1D)', 'Q = (T_{s,max} − T_{in}) / R_{th}', `Q = (${n(s.TsMax)} − ${n(s.Tin)}) / ${n(Rth)}`, `Q = ${R(Q, 'W', 'powerAlt')}`);
    }
    const Tout = s.Tin + Q * Rcap;
    values.Tout = Tout;
    step('Coolant outlet temperature', 'T_{out} = T_{in} + Q / (ṁ·c_{p})', `T_{out} = ${n(s.Tin)} + ${n(Q)} / (${n(mdot)}·${n(pr.cp)})`, `T_{out} = ${R(Tout, '°C', 'temp')}`,
      t('Energy balance: all heat leaves with the coolant.'));
    if (map) {
      const peak = map.Tmax;
      step('2D plate model', '∇·(k_{s}·t_{loc}·∇T) + q″ − h_{eff}·(T − T_{c}) = 0', '',
        `T_{max,2D} = ${R(peak, '°C', 'temp')}`,
        t('Solved numerically on a {nx} × {ny} grid; the headline result uses this model because it resolves edges and hot spots that the 1D network averages out.', { nx: map.grid.nx, ny: map.grid.ny }));
    }

    // ---------- 5. Components ----------
    if (s.heatArea === 'sources' && map && map.sources.length) {
      section('Hottest component');
      let k = 0;
      map.sources.forEach((r, i) => { if (r.Tj > map.sources[k].Tj) k = i; });
      const r = map.sources[k], src = s.sources[k];
      const area = src.w * src.h;
      const zb = src.tim > 0 && src.kTim > 0 ? src.tim / src.kTim : 0;
      const Rtim = (zb + (src.rcTim || 0)) / area;
      sections[sections.length - 1].intro = r.name;
      step('TIM resistance', 'R_{TIM} = (t_{TIM} / k_{TIM} + R_{c}) / A_{src}',
        `R_{TIM} = (${n(src.tim)} / ${n(src.kTim)} + ${n(src.rcTim || 0)}) / ${n(area)}`, `R_{TIM} = ${R(Rtim, 'K/W', 'rth')}`,
        t('R_{c} = contact resistance of both interfaces (m²K/W).'));
      const Tcase = r.Tplate + src.P * Rtim;
      step('Case temperature', 'T_{case} = T̄_{plate} + P·R_{TIM}', `T_{case} = ${n(r.Tplate)} + ${n(src.P)}·${n(Rtim)}`, `T_{case} = ${R(Tcase, '°C', 'temp')}`,
        t('T̄_{plate} = mean plate temperature under the footprint, from the 2D model.'));
      const Tj = Tcase + src.P * (src.rjc || 0);
      values.Tj = Tj;
      step('Junction temperature', 'T_{j} = T_{case} + P·R_{jc}', `T_{j} = ${n(Tcase)} + ${n(src.P)}·${n(src.rjc || 0)}`, `T_{j} = ${R(Tj, '°C', 'temp')}`);
      step('Margin to limit', 'ΔT_{margin} = T_{limit} − T_{j}', `ΔT_{margin} = ${n(src.Tlimit)} − ${n(Tj)}`, `ΔT_{margin} = ${R(src.Tlimit - Tj, 'K', 'dtemp')}`);
    }

    // ---------- 6. Pressure drop ----------
    section('Pressure drop');
    let f;
    if (regime === 'Laminar') {
      const xp = Ls / (Dh * Re);
      f = Physics.laminarFApp(fd.fRe, Re, Dh, Ls);
      if (s.shape !== 'round') step('Fully developed laminar f·Re', 'f·Re_{fd} = 96·(1 − 1.3553α + 1.9467α^{2} − 1.7012α^{3} + 0.9564α^{4} − 0.2537α^{5})', `α = ${n(alpha, 3)}`, `f·Re_{fd} = ${n(fd.fRe)}`, t('Shah & London, Darcy friction factor.'));
      else step('Fully developed laminar f·Re', 'f·Re_{fd} = 64', '', 'f·Re_{fd} = 64');
      step('Apparent friction factor (developing flow)', 'x^{+} = L_{s} / (D_{h}·Re),   f_{app}·Re = 3.44/√x^{+} + (f·Re_{fd} + 1.25/(4x^{+}) − 3.44/√x^{+}) / (1 + 2.1·10^{−4}/x^{+2})',
        `x^{+} = ${n(Ls)} / (${n(Dh)}·${n(Re)})`, `x^{+} = ${n(xp)},   f_{app} = ${n(f)}`, t('Shah (1978): includes the extra loss of the developing velocity profile.'));
    } else if (regime === 'Turbulent') {
      f = turb(Re).f;
      step('Friction factor', 'f = [−1.8·log_{10}((ε_{r}/D_{h} / 3.7)^{1.11} + 6.9 / Re)]^{−2}', `Re = ${n(Re)}`, `f = ${n(f)}`, t('Haaland, as above.'));
    } else {
      const a = Physics.laminarFApp(fd.fRe, RE_LAM, Dh, Ls), b = turb(RE_TURB).f, x = (Re - RE_LAM) / (RE_TURB - RE_LAM);
      f = a + x * (b - a);
      step('Friction factor', 'f = f_{lam}(2300) + x·(f_{turb}(4000) − f_{lam}(2300))', `f_{lam} = ${n(a)},   f_{turb} = ${n(b)},   x = ${n(x, 3)}`, `f = ${n(f)}`);
    }
    values.f = f;
    const qd = 0.5 * pr.rho * v * v;
    step('Dynamic pressure', 'q = ½·ρ·v^{2}', `q = ½·${n(pr.rho)}·${n(v)}^{2}`, `q = ${R(qd, 'Pa')}`);
    const dpF = f * (Lch / Dh) * qd;
    step('Channel friction', 'Δp_{f} = f·(L_{ch} / D_{h})·q', `Δp_{f} = ${n(f)}·(${n(Lch)} / ${n(Dh)})·${n(qd)}`, `Δp_{f} = ${R(dpF, 'Pa', 'dpressure')}`,
      serp ? '' : t('Average channel with a uniform split.'));
    const dpEE = 1.5 * qd;
    step('Channel entry and exit', 'Δp_{ee} = (K_{in} + K_{out})·q = (0.5 + 1.0)·q', `Δp_{ee} = 1.5·${n(qd)}`, `Δp_{ee} = ${R(dpEE, 'Pa', 'dpressure')}`);
    let dpB = 0;
    if (g.nBends > 0) {
      const Kb = Physics.bendK(Re, Dh, g.bendRadius);
      dpB = g.nBends * Kb * qd;
      step('180° bends (Darby 3-K)', 'K_{b} = 1000/Re + K_{i}·(1 + 4/D_{n}^{0.3}),   Δp_{b} = n_{b}·K_{b}·q',
        `K_{b} = ${n(Kb, 3)},   n_{b} = ${g.nBends}`, `Δp_{b} = ${R(dpB, 'Pa', 'dpressure')}`, t('D_{n} = nominal diameter in inches; K_{i} = 0.35 for tight bends (r/D_{h} < 1), else 0.10.'));
    }
    const Aport = Math.PI * s.portD ** 2 / 4, vPort = mdot / (pr.rho * Aport);
    const dpP = 2 * 1.5 * 0.5 * pr.rho * vPort * vPort;
    step('Inlet and outlet ports', 'v_{port} = ṁ / (ρ·π·d^{2}/4),   Δp_{port} = 2·1.5·½·ρ·v_{port}^{2}',
      `v_{port} = ${n(mdot)} / (${n(pr.rho)}·π·${n(s.portD)}^{2}/4)`, `v_{port} = ${R(vPort, 'm/s', 'velocity')},   Δp_{port} = ${R(dpP, 'Pa', 'dpressure')}`,
      t('K = 1.5 per port (90° turn plus expansion or contraction).'));
    let dp;
    if (serp) {
      dp = dpF + dpEE + dpB + dpP;
      step('Total pressure drop', 'Δp = Δp_{f} + Δp_{ee} + Δp_{b} + Δp_{port}', `Δp = ${n(dpF)} + ${n(dpEE)} + ${n(dpB)} + ${n(dpP)}`, `Δp = ${R(dp, 'Pa', 'dpressure')}`);
    } else {
      dp = res.dp;
      step('Manifold network and total', 'Δp = Δp_{network}(inlet port → outlet port) + Δp_{port}', '',
        `Δp = ${R(res.dp, 'Pa', 'dpressure')}`,
        t('Solved numerically: header friction and momentum against each channel\'s own Δp(q) curve, iterated until the channel flows add up to the total.'));
    }
    values.dp = dp;
    const Vdot = mdot / pr.rho;
    step('Hydraulic pump power', 'P_{hyd} = V̇·Δp', `P_{hyd} = ${n(Vdot)}·${n(dp)}`, `P_{hyd} = ${R(Vdot * dp, 'W')}`, t('Shaft power = P_{hyd} / pump efficiency.'));

    return { sections, values, references: REFERENCES };
  }

  const REFERENCES = [
    'Shah, R. K., London, A. L. (1978). Laminar Flow Forced Convection in Ducts. Academic Press.',
    'Shah, R. K. (1978). A correlation for laminar hydrodynamic entry length solutions for circular and noncircular ducts. J. Fluids Eng. 100, 177–179.',
    'Gnielinski, V. (1976). New equations for heat and mass transfer in turbulent pipe and channel flow. Int. Chem. Eng. 16, 359–368.',
    'Haaland, S. E. (1983). Simple and explicit formulas for the friction factor in turbulent pipe flow. J. Fluids Eng. 105, 89–90.',
    'Darby, R. (2001). Correlate pressure drops through fittings. Chemical Engineering 108(4), 127–130.',
    'Bajura, R. A., Jones, E. H. (1976). Flow distribution manifolds. J. Fluids Eng. 98, 654–665.',
    'Incropera, F. P., DeWitt, D. P., Bergman, T. L., Lavine, A. S. Fundamentals of Heat and Mass Transfer. Wiley.',
    'Idelchik, I. E. Handbook of Hydraulic Resistance. Begell House.',
  ];

  /** Formula markup → HTML (input is escaped first). */
  function toHtml(str) {
    const esc = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
  }
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻', '+': '⁺' };
  /** Formula markup → plain text (PDF): simple superscripts as Unicode, others as ^(...). */
  function toText(str) {
    return String(str)
      .replace(/_\{([^}]*)\}/g, (m, x) => (x.length > 1 ? `_${x}` : x))
      .replace(/\^\{([^}]*)\}/g, (m, x) => ([...x].every((c) => SUP[c]) ? [...x].map((c) => SUP[c]).join('') : `^(${x})`));
  }

  const Steps = { build, toHtml, toText, REFERENCES };
  if (isNode) module.exports = Steps;
  else root.Steps = Steps;
})(typeof window !== 'undefined' ? window : globalThis);
