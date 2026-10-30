/*
 * Cold-plate thermal / hydraulic model (1D resistance network).
 *
 * Input and output are SI (m, °C, Pa, W, kg/s). See README for the full
 * list of correlations and assumptions. Summary:
 *   - Laminar: Shah & London fully-developed f·Re and Nu_H1 vs. aspect ratio,
 *     Shah apparent friction for developing flow, Hausen-type entry correction.
 *   - Turbulent: Haaland friction factor, Gnielinski Nu with entry correction.
 *   - Transition (2300 < Re < 4000): linear blend.
 *   - Channel side walls as fins; lateral spreading in the plate between
 *     channels; plate lateral conduction blends between the uniform-heat-flux
 *     (conservative) and isothermal-plate (ideal) limits.
 *   - Minor losses: Darby 3-K for 180° bends, fixed K for ports, headers,
 *     channel entry and exit.
 */
(function (root) {
  'use strict';

  const Data = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.CPData;
  const R_UNIV = 8.314462618;
  const RE_LAM = 2300;
  const RE_TURB = 4000;

  // ---------- Messages ----------

  /** Fill {name} placeholders. */
  function fill(tpl, p) { return p ? tpl.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : tpl; }
  /** Design-check message: template + values, so the UI can translate it; msg is the English text. */
  function M(level, tpl, params) { return { level, tpl, params, msg: fill(tpl, params) }; }

  // ---------- Fluid properties ----------

  function interpRows(rows, T, col, logScale) {
    let i = 0;
    while (i < rows.length - 2 && T > rows[i + 1][0]) i++;
    const [T0, T1] = [rows[i][0], rows[i + 1][0]];
    let y0 = rows[i][col], y1 = rows[i + 1][col];
    if (logScale) { y0 = Math.log(y0); y1 = Math.log(y1); }
    const y = y0 + (y1 - y0) * (T - T0) / (T1 - T0);
    return logScale ? Math.exp(y) : y;
  }

  /** Water saturation temperature [°C] at absolute pressure p [Pa] (Antoine). */
  function waterTsat(p) {
    const mmHg = p / 133.322;
    const [A, B, C] = p > 101325 ? [8.14019, 1810.94, 244.485] : [8.07131, 1730.63, 233.426];
    return B / (A - Math.log10(mmHg)) - C;
  }

  /** Thermophysical properties of a fluid at T [°C] and absolute pressure p [Pa]. */
  function fluidProps(id, T, p) {
    const f = Data.FLUIDS[id];
    if (!f) throw new Error('Unknown fluid ' + id);
    if (f.phase === 'liquid') {
      const rows = f.rows;
      const Tc = Math.min(Math.max(T, rows[0][0]), rows[rows.length - 1][0]);
      return {
        phase: 'liquid',
        rho: interpRows(rows, Tc, 1),
        cp: interpRows(rows, Tc, 2),
        k: interpRows(rows, Tc, 3),
        mu: interpRows(rows, Tc, 4, true) * 1e-3,
        outOfRange: T < rows[0][0] - 0.01 || T > rows[rows.length - 1][0] + 0.01,
        range: [rows[0][0], rows[rows.length - 1][0]],
      };
    }
    const TK = T + 273.15;
    const cpRows = f.cp;
    const Tc = Math.min(Math.max(TK, cpRows[0][0]), cpRows[cpRows.length - 1][0]);
    return {
      phase: 'gas',
      rho: p * f.M / (R_UNIV * TK),
      cp: interpRows(cpRows, Tc, 1),
      k: f.k0 * Math.pow(TK / 273.15, f.kn),
      mu: f.mu0 * Math.pow(TK / 273.15, 1.5) * (273.15 + f.S) / (TK + f.S),
      sound: Math.sqrt(f.gamma * R_UNIV * TK / f.M),
      outOfRange: TK < cpRows[0][0] || TK > cpRows[cpRows.length - 1][0],
      range: [cpRows[0][0] - 273.15, cpRows[cpRows.length - 1][0] - 273.15],
    };
  }

  // ---------- Correlations ----------

  /** Fully developed laminar f·Re (Darcy) and Nu_H1 for a rectangular duct (Shah & London 1978). */
  function laminarFD(shape, alpha) {
    if (shape === 'round') return { fRe: 64, Nu: 4.364 };
    const a = alpha;
    const fRe = 96 * (1 - 1.3553 * a + 1.9467 * a ** 2 - 1.7012 * a ** 3 + 0.9564 * a ** 4 - 0.2537 * a ** 5);
    const Nu = 8.235 * (1 - 2.0421 * a + 3.0853 * a ** 2 - 2.4765 * a ** 3 + 1.0578 * a ** 4 - 0.1861 * a ** 5);
    return { fRe, Nu };
  }

  /** Mean apparent Darcy friction factor for developing laminar flow over length L (Shah 1978). */
  function laminarFApp(fRe, Re, Dh, L) {
    const xp = L / (Dh * Re);
    const Kinf = 1.25, C = 0.00021;
    const s = 3.44 / Math.sqrt(xp);
    return (s + (fRe + Kinf / (4 * xp) - s) / (1 + C / (xp * xp))) / Re;
  }

  /** Mean laminar Nu including thermal-entry enhancement (Hausen form). */
  function laminarNu(NuFD, Re, Pr, Dh, L) {
    const Gz = Dh * Re * Pr / L;
    return NuFD + 0.0668 * Gz / (1 + 0.04 * Math.pow(Gz, 2 / 3));
  }

  /** Turbulent Darcy friction factor (Haaland). */
  function turbulentF(Re, relRough) {
    const t = Math.pow(relRough / 3.7, 1.11) + 6.9 / Re;
    return Math.pow(-1.8 * Math.log10(t), -2);
  }

  /** Gnielinski Nu with short-duct entry correction. */
  function turbulentNu(f, Re, Pr, Dh, L) {
    const Nu = (f / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2 / 3) - 1));
    return Nu * (1 + Math.pow(Dh / L, 2 / 3));
  }

  /** Darby 3-K loss coefficient for a 180° return bend. */
  function bendK(Re, Dh, radius) {
    const Dn = Dh / 0.0254; // nominal diameter, inches
    const Ki = radius / Dh < 1 ? 0.35 : 0.10;
    return 1000 / Re + Ki * (1 + 4 / Math.pow(Dn, 0.3));
  }

  /** Channel flow: f, Nu, regime for given Re, Pr over a straight length Lp. */
  function channelFlow(shape, alpha, Re, Pr, Dh, Lp, relRough) {
    const fd = laminarFD(shape, alpha);
    const lam = (r) => ({ f: laminarFApp(fd.fRe, r, Dh, Lp), Nu: laminarNu(fd.Nu, r, Pr, Dh, Lp) });
    const turb = (r) => { const f = turbulentF(r, relRough); return { f, Nu: turbulentNu(f, r, Pr, Dh, Lp) }; };
    if (Re <= RE_LAM) return Object.assign(lam(Re), { regime: 'Laminar' });
    if (Re >= RE_TURB) return Object.assign(turb(Re), { regime: 'Turbulent' });
    const s = (Re - RE_LAM) / (RE_TURB - RE_LAM);
    const a = lam(RE_LAM), b = turb(RE_TURB);
    return { f: a.f + s * (b.f - a.f), Nu: a.Nu + s * (b.Nu - a.Nu), regime: 'Transitional' };
  }

  // ---------- Geometry ----------

  function geometry(s) {
    const issues = [];
    const along = s.orient === 'length';
    const run = along ? s.L : s.W;      // direction the straight channels run
    const span = along ? s.W : s.L;     // direction channels are stacked across
    const m = s.margin;

    let a, b, A, P;
    if (s.shape === 'round') { a = b = s.D; A = Math.PI * s.D ** 2 / 4; P = Math.PI * s.D; }
    else if (s.shape === 'square') { a = b = s.cw; A = a * a; P = 4 * a; }
    else { a = s.cw; b = s.cd; A = a * b; P = 2 * (a + b); }
    const Dh = 4 * A / P;
    const alpha = Math.min(a, b) / Math.max(a, b);

    const serp = s.layout === 'serpentine';
    const circuits = serp ? Math.max(1, Math.round(s.circuits)) : 1;
    const count = Math.max(1, Math.round(s.count));
    const nRuns = serp ? count * circuits : count;
    const nPar = serp ? circuits : count;
    const pitch = (span - 2 * m) / nRuns;
    const web = pitch - a;

    let straight, Lch, nBends = 0, bendRadius = 0, headerArea = 0, headerVol = 0;
    if (serp) {
      straight = run - 2 * m - circuits * pitch;
      bendRadius = circuits * pitch / 2;
      nBends = count - 1;
      Lch = count * straight + nBends * Math.PI * bendRadius;
    } else {
      straight = run - 2 * m - 2 * s.header;
      Lch = straight;
      const hd = s.headerDepth > 0 ? s.headerDepth : b;
      headerArea = s.header * hd;
      headerVol = 2 * s.header * (span - 2 * m) * hd;
      if (s.t - hd - s.wallHeated < 0) issues.push(M('error', 'Header depth plus heated-face wall exceeds plate thickness.'));
    }

    const backWall = s.t - b - s.wallHeated;
    const heatArea = s.heatArea === 'channels' ? (span - 2 * m) * (run - 2 * m) : s.W * s.L;
    const fluidVol = nPar * A * Lch + headerVol;

    if (!(s.W > 0 && s.L > 0 && s.t > 0)) issues.push(M('error', 'Plate dimensions must be positive.'));
    if (!(a > 0 && b > 0)) issues.push(M('error', 'Channel dimensions must be positive.'));
    if (web <= 0) issues.push(M('error', 'Channels do not fit: {n} runs need a pitch larger than the channel width. Reduce the count or the channel width, or widen the plate.', { n: nRuns }));
    else if (web < 0.001) issues.push(M('warn', 'Wall between channels is under 1 mm (0.04 in) — check manufacturability.'));
    if (straight <= 0) issues.push(M('error', 'No straight channel length left after margins, bends and headers. Reduce margins/header width.'));
    if (backWall < 0) issues.push(M('error', 'Channel depth plus heated-face wall exceeds plate thickness.'));
    else if (backWall < 0.001) issues.push(M('warn', 'Back wall (opposite the heated face) is under 1 mm — check pressure rating and sealing/brazing.'));
    if (s.wallHeated <= 0) issues.push(M('error', 'Heated-face wall thickness must be positive.'));
    else if (s.wallHeated < 0.001) issues.push(M('warn', 'Heated-face wall is under 1 mm — check flatness and machining limits.'));

    return { run, span, a, b, A, P, Dh, alpha, nRuns, nPar, pitch, web, straight, Lch, nBends, bendRadius,
      headerArea, backWall, heatArea, fluidVol, circuits, count, issues };
  }

  // ---------- Main solver ----------

  /** Heat transfer in one channel carrying mass flow mch: h, fin efficiency and effective wetted perimeter. */
  function channelHT(s, g, ks, pr, mch) {
    const v = mch / (pr.rho * g.A);
    const Re = Math.max(1e-6, pr.rho * v * g.Dh / pr.mu);
    const Pr = pr.cp * pr.mu / pr.k;
    const fl = channelFlow(s.shape, g.alpha, Re, Pr, g.Dh, Math.max(g.straight, g.Dh), s.roughness / g.Dh);
    const h = fl.Nu * pr.k / g.Dh;
    // Fin efficiency of the walls between channels (convective on both faces).
    const mFin = Math.sqrt(2 * h / (ks * g.web));
    const finH = s.shape === 'round' ? g.a / 2 : g.b;
    const eta = mFin * finH > 1e-9 ? Math.tanh(mFin * finH) / (mFin * finH) : 1;
    const Peff = s.shape === 'round'
      ? Math.PI * g.a * (0.5 + 0.5 * eta)
      : g.a + 2 * g.b * eta + g.a * eta * eta;
    return { v, Re, Pr, fl, h, eta, Peff };
  }

  // Manifold momentum coefficients (fraction of the Bernoulli velocity-head change):
  // dividing (inlet) header regains pressure as it slows, combining (outlet) header loses it.
  const C_DIVIDING = 1.0, C_COMBINING = 2.0;

  /**
   * Flow split between the parallel channels of a Z- or U-type manifold.
   * Headers are discretised between channel junctions with friction and
   * momentum terms; each channel follows its own nonlinear Δp(q) curve
   * (developing friction + entry/exit). Returns per-channel volume flows.
   */
  function flowDistribution(s, g, pr, mdot) {
    const N = g.count, rho = pr.rho, mu = pr.mu;
    const Q = mdot / rho;
    const Pr = pr.cp * mu / pr.k;
    const Lp = Math.max(g.straight, g.Dh);
    const relR = s.roughness / g.Dh;

    // Channel Δp(q) table, inverted by interpolation.
    const chDp = (q) => {
      if (q <= 0) return 0;
      const v = q / g.A;
      const fl = channelFlow(s.shape, g.alpha, Math.max(1e-6, rho * v * g.Dh / mu), Pr, g.Dh, Lp, relR);
      return (fl.f * g.Lch / g.Dh + 1.5) * 0.5 * rho * v * v;
    };
    const tq = [0], tp = [0];
    for (let i = 0; i <= 160; i++) { const q = Q * Math.pow(10, -4 + 4.3 * i / 160); tq.push(q); tp.push(chDp(q)); }
    const qOf = (dp) => {
      if (dp <= 0) return 0;
      if (dp >= tp[tp.length - 1]) return tq[tq.length - 1] * Math.sqrt(dp / tp[tp.length - 1]);
      let lo = 0, hi = tp.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tp[mid] < dp) lo = mid; else hi = mid; }
      return tq[lo] + (tq[hi] - tq[lo]) * (dp - tp[lo]) / (tp[hi] - tp[lo]);
    };

    // Header geometry and friction.
    const hd = s.headerDepth > 0 ? s.headerDepth : g.b;
    const Ah = s.header * hd, Dhh = 2 * s.header * hd / (s.header + hd);
    const aH = Math.min(s.header, hd) / Math.max(s.header, hd);
    const segDp = (G) => {
      if (G <= 0) return 0;
      const V = G / Ah;
      const f = channelFlow('rect', aH, Math.max(1e-6, rho * V * Dhh / mu), Pr, Dhh, 1e3 * Dhh, s.roughness / Dhh).f;
      return f * (g.pitch / Dhh) * 0.5 * rho * V * V;
    };
    const vh = (G) => G / Ah;

    let q = new Array(N).fill(Q / N);
    const pin = new Array(N), pout = new Array(N);
    let D = 0, pExit = 0, it = 0;
    for (; it < 300; it++) {
      // Inlet (dividing) header, flowing from channel 1 to N. Pressures relative to the inlet port.
      let G = Q, p = 0;
      for (let i = 0; i < N; i++) {
        pin[i] = p;
        const up = vh(G);
        G -= q[i];
        p += C_DIVIDING * 0.5 * rho * (up * up - vh(G) * vh(G));
        if (i < N - 1) p -= segDp(G);
      }
      // Outlet (combining) header: Z exits after channel N, U after channel 1.
      const order = s.layout === 'parallelU' ? [...Array(N).keys()].reverse() : [...Array(N).keys()];
      G = 0; p = 0;
      order.forEach((i, k) => {
        pout[i] = p;
        const up = vh(G);
        G += q[i];
        p -= C_COMBINING * 0.5 * rho * (vh(G) * vh(G) - up * up);
        if (k < N - 1) p -= segDp(G);
      });
      pExit = p;
      // Outlet level D so that the channel flows add up to Q: channel i sees pin[i] − pout[i] + D.
      const sumQ = (d) => pin.reduce((a, pi, i) => a + qOf(pi - pout[i] + d), 0);
      let lo = -Math.max(...pin.map((pi, i) => pi - pout[i])), hi = Math.max(1, -lo) + chDp(Q) * 2;
      while (sumQ(hi) < Q) hi *= 2;
      for (let k = 0; k < 50; k++) { const mid = 0.5 * (lo + hi); if (sumQ(mid) < Q) lo = mid; else hi = mid; }
      D = 0.5 * (lo + hi);
      const qNew = pin.map((pi, i) => qOf(pi - pout[i] + D));
      let change = 0;
      for (let i = 0; i < N; i++) { change = Math.max(change, Math.abs(qNew[i] - q[i])); q[i] = 0.5 * q[i] + 0.5 * qNew[i]; }
      if (change < 1e-5 * Q / N) break;
    }
    const dpCh = pin.map((pi, i) => pi - pout[i] + D);
    const frac = q.map((qi) => qi * N / Q);
    const dpChannels = q.reduce((a, qi, i) => a + qi * dpCh[i], 0) / Q; // flow-weighted
    const dpNetwork = D - pExit; // inlet port to outlet port (positive)
    const minI = frac.indexOf(Math.min(...frac)), maxI = frac.indexOf(Math.max(...frac));
    const mean = 1, sd = Math.sqrt(frac.reduce((a, f) => a + (f - mean) ** 2, 0) / N);
    return { q, frac, dpCh, dpChannels, dpNetwork, minI, maxI, min: frac[minI], max: frac[maxI], cv: sd, iterations: it, vHeaderMax: vh(Q) };
  }

  const SI_UNITS = { velocity: 'm/s', temp: '°C', dtemp: 'K', dpressure: 'kPa' };
  function defaultFmt(q, v) {
    if (q === 'dpressure') return (v / 1e3).toFixed(1) + ' kPa';
    return (Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1)) + ' ' + SI_UNITS[q];
  }

  /** Convert the flow input to mass flow [kg/s]. */
  function massFlow(s, propsIn) {
    if (s.flowMode === 'mass') return s.flow;
    if (s.flowMode === 'std') return s.flow * Data.FLUIDS[s.fluid].M; // mol/s × kg/mol
    return s.flow * propsIn.rho;
  }

  function solve(s, opts = {}) {
    const g = geometry(s);
    const issues = g.issues.slice();
    if (issues.some((i) => i.level === 'error')) return { ok: false, geometry: g, issues };

    if (s.fluid === 'custom') Data.setCustomFluid(s.customFluid || Data.DEFAULT_CUSTOM_FLUID);
    const fluid = Data.FLUIDS[s.fluid];
    const mat = Data.MATERIALS[s.material];
    const ks = s.material === 'custom' ? s.kCustom : mat.k;
    const rhoS = s.material === 'custom' ? s.rhoCustom : mat.rho;
    const propsIn = fluidProps(s.fluid, s.Tin, s.pIn);
    const mdot = massFlow(s, propsIn);
    if (!(mdot > 0)) return { ok: false, geometry: g, issues: issues.concat(M('error', 'Flow rate must be positive.')) };

    const serp = s.layout === 'serpentine';
    const relRough = s.roughness / g.Dh;
    const Lp = Math.max(g.straight, g.Dh); // developing-flow length: one straight pass

    let Tm = s.Tin, r = null;
    for (let it = 0; it < 40; it++) {
      const pr = fluidProps(s.fluid, Tm, s.pIn);
      const C = mdot * pr.cp;
      const mch = mdot / g.nPar;
      const { v, Re, Pr, fl, h, eta, Peff } = channelHT(s, g, ks, pr, mch);
      const Aeff = g.nPar * Peff * g.Lch;

      const Rconv = 1 / (h * Aeff);
      const Rcap = 1 / C;
      const NTU = 1 / (Rconv * C);
      const eps = 1 - Math.exp(-NTU);
      const Rwall = s.wallHeated / (ks * g.heatArea);
      const sWeb = g.web / 2;
      const sEdge = s.heatArea === 'full' ? s.margin : 0;
      const sMax = Math.max(sWeb, sEdge);
      const Rspread = sMax * sMax / (2 * ks * s.t * g.heatArea);

      // Lateral conduction blending between uniform flux and isothermal plate.
      const Llat = serp ? g.span : g.run;
      const Blat = serp ? g.run : g.span;
      const Rlat = Llat / (8 * ks * s.t * Blat);
      const w = Rlat / (Rlat + Rcap);
      const Ruf = Rcap + Rconv + Rwall + Rspread;
      const Riso = Rcap / eps + Rwall + Rspread;
      const Rtot = w * Ruf + (1 - w) * Riso;

      let Q, TsMax;
      if (s.mode === 'capacity') { Q = Math.max(0, (s.TsMax - s.Tin) / Rtot); TsMax = s.TsMax; }
      else { Q = s.Q; TsMax = s.Tin + Q * Rtot; }
      const Tout = s.Tin + Q * Rcap;

      r = { pr, C, mch, v, Re, Pr, fl, h, eta, Peff, Aeff, Rconv, Rcap, NTU, eps, Rwall, Rspread, Rlat, w, Ruf, Riso, Rtot, Q, TsMax, Tout };
      const TmNew = (s.Tin + Tout) / 2;
      if (Math.abs(TmNew - Tm) < 1e-4) break;
      Tm = Tm + 0.7 * (TmNew - Tm);
    }

    // Pressure drop at mean properties.
    const { pr, v, Re, fl } = r;
    const qdyn = 0.5 * pr.rho * v * v;
    const dpFriction = fl.f * (g.Lch / g.Dh) * qdyn;
    const Kb = g.nBends > 0 ? bendK(Re, g.Dh, g.bendRadius) : 0;
    const dpBends = g.nBends * Kb * qdyn;
    const dpEntryExit = 1.5 * qdyn; // channel entry 0.5 + exit 1.0
    const Aport = Math.PI * s.portD ** 2 / 4;
    const vPort = mdot / (pr.rho * Aport);
    const dpPorts = 2 * 1.5 * 0.5 * pr.rho * vPort * vPort; // 90° turn + expansion, each port
    let dpHeaders = 0, vHeader = 0, dist = null;
    let dpFr = dpFriction, dpEE = dpEntryExit;
    if (!serp) {
      vHeader = mdot / (pr.rho * g.headerArea);
      // Manifold network: actual flow split, header losses and channel pressure drop.
      dist = flowDistribution(s, g, pr, mdot);
      const share = dpFriction / (dpFriction + dpEntryExit);
      dpFr = dist.dpChannels * share;
      dpEE = dist.dpChannels * (1 - share);
      dpHeaders = Math.max(0, dist.dpNetwork - dist.dpChannels);
    }
    const dp = (serp ? dpFriction + dpEntryExit : Math.max(dist.dpNetwork, dist.dpChannels)) + dpBends + dpPorts;
    const volFlow = mdot / pr.rho;
    const pumpPower = dp * volFlow;

    // Warnings / design checks. opts.fmt(quantity, siValue) formats values in the caller's unit system.
    const add = (level, tpl, params) => issues.push(M(level, tpl, params));
    const F = opts.fmt || defaultFmt;
    if (pr.phase === 'liquid') {
      if (v > mat.vmax) add('warn', 'Channel velocity {v} exceeds the ~{vmax} erosion-corrosion guideline for {mat}.', { v: F('velocity', v), vmax: F('velocity', mat.vmax), mat: mat.name });
      if (vPort > mat.vmax * 1.5) add('warn', 'Port velocity {v} is high — consider a larger port/fitting.', { v: F('velocity', vPort) });
      if (v < 0.2) add('info', 'Channel velocity is below {v} — risk of air entrapment and fouling; flow may not purge bubbles.', { v: F('velocity', 0.2) });
      if (s.Tin < fluid.freeze + 3) add('error', 'Inlet temperature is at or near the freezing point of {fluid} ({T}).', { fluid: fluid.short, T: F('temp', fluid.freeze) });
      // Aqueous coolants: water saturation at inlet pressure plus an offset. Others: boiling point at 1 atm.
      const fixedBoil = fluid.boil !== undefined;
      const Tboil = fixedBoil ? fluid.boil : waterTsat(s.pIn) + fluid.boilOffset;
      r.Tboil = Tboil;
      if (r.TsMax > Tboil - 5) add('warn', fixedBoil ? 'Peak surface temperature is within {dT} of the coolant boiling point (~{T} at 1 atm) — local boiling possible.' : 'Peak surface temperature is within {dT} of the coolant boiling point (~{T} at inlet pressure) — local boiling possible.', { dT: F('dtemp', 5), T: F('temp', Tboil) });
      if (fluid.dielectric) add('info', '{fluid} is a dielectric coolant (safe on live electronics), but its heat capacity and conductivity are far below water/glycol — expect lower performance and check seal/material compatibility.', { fluid: fluid.short });
      if (s.material !== 'custom' && mat.family === 'al' && s.fluid === 'water')
        add('info', 'Aluminium with plain water: use inhibited coolant or controlled DI water to avoid corrosion.');
      if (s.material !== 'custom' && mat.family === 'cu' && /fuel/i.test(opts.app || ''))
        add('info', 'Copper ions can poison fuel-cell membranes — keep copper out of the stack coolant loop.');
    } else {
      const Mach = v / pr.sound;
      r.Mach = Mach;
      if (Mach > 0.3) add('warn', 'Mach {M} in channels — compressibility is significant; results unreliable above Mach 0.3.', { M: Mach.toFixed(2) });
      if (dp > 0.1 * s.pIn) add('warn', 'Pressure drop is {pct} % of inlet pressure — density changes along the plate are not modelled; treat results as rough.', { pct: (100 * dp / s.pIn).toFixed(0) });
      if (s.pIn > 50e5) add('warn', 'Above ~50 bar the ideal-gas assumption becomes inaccurate (especially for H₂).');
      if (s.fluid === 'h2') {
        add('info', 'Hydrogen: use H₂-compatible materials and seals; follow ISO 19880 / leak-tightness requirements.');
        if (s.material === 'ti2') add('warn', 'Titanium absorbs hydrogen and can embrittle — not recommended in H₂ service.');
      }
    }
    if (dist) {
      const lowCh = dist.minI + 1;
      if (dist.min < 0.8) add('warn', s.layout === 'parallelZ' ? 'Uneven flow split: channel {ch} gets only {min} % of the average flow (max {max} %). Widen or deepen the headers, try a U-type layout, or make the channels more restrictive.' : 'Uneven flow split: channel {ch} gets only {min} % of the average flow (max {max} %). Widen or deepen the headers, or make the channels more restrictive.', { ch: lowCh, min: (100 * dist.min).toFixed(0), max: (100 * dist.max).toFixed(0) });
      else if (dist.min < 0.9) add('info', 'Channel flows range from {min} % to {max} % of the average.', { min: (100 * dist.min).toFixed(0), max: (100 * dist.max).toFixed(0) });
    }
    if (pr.outOfRange) add('warn', 'Fluid temperature outside property data range ({a} … {b}) — properties extrapolated as constant.', { a: F('temp', pr.range[0]), b: F('temp', pr.range[1]) });
    if (dp > 100e3) add('warn', 'Pressure drop is {dp} (above 1 bar) — check pump capability and plate pressure rating.', { dp: F('dpressure', dp) });
    if (r.Tout - s.Tin > 15) add('info', 'Coolant temperature rise is {dT} — consider more flow for better uniformity.', { dT: F('dtemp', r.Tout - s.Tin) });
    if (s.mode === 'capacity' && s.TsMax <= s.Tin) add('error', 'Max. surface temperature must be above the coolant inlet temperature.');
    const spread = r.w * (r.Tout - s.Tin) + r.Q * r.Rspread;
    if (r.eta < 0.6) add('info', 'Channel wall fin efficiency is low ({pct} %) — plate material conducts poorly for this channel depth.', { pct: (100 * r.eta).toFixed(0) });

    const plateMass = rhoS * (s.W * s.L * s.t - g.fluidVol);
    return {
      ok: !issues.some((i) => i.level === 'error'),
      geometry: g, issues,
      mdot, volFlow, propsIn, props: pr,
      v, vPort, vHeader, Re, Pr: r.Pr, regime: fl.regime, f: fl.f, Nu: fl.Nu, h: r.h, eta: r.eta,
      Aeff: r.Aeff, Peff: r.Peff, NTU: r.NTU, eps: r.eps, lateralWeight: r.w,
      Q: r.Q, TsMax: r.TsMax, Tin: s.Tin, Tout: r.Tout, Rth: r.Rtot, Tboil: r.Tboil, Mach: r.Mach,
      flux: r.Q / g.heatArea, spread,
      resistances: { capacity: r.Rcap, convection: r.Rtot - r.Rcap - r.Rwall - r.Rspread, wall: r.Rwall, spreading: r.Rspread },
      bounds: { uniformFlux: r.Ruf, isothermal: r.Riso },
      dp, dpParts: { friction: dpFr, bends: dpBends, entryExit: dpEE, headers: dpHeaders, ports: dpPorts }, dist,
      pumpPower, plateMass, fluidVol: g.fluidVol, ks,
    };
  }

  /** Sweep flow from 0.25× to 3× the current value for performance curves. */
  function sweep(s, n = 24) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const k = 0.25 + (2.75 * i) / (n - 1);
      const res = solve(Object.assign({}, s, { flow: s.flow * k }));
      if (res.ok || (res.Q !== undefined && isFinite(res.Q))) pts.push({ k, flow: s.flow * k, res });
    }
    return pts;
  }

  // ---------- Pump curve / operating point ----------

  /** Pump pressure rise [Pa] at volume flow q [m³/s]; linear between points, 0 beyond the last point. */
  function pumpDp(points, q) {
    const p = points.slice().sort((a, b) => a[0] - b[0]);
    if (!p.length) return 0;
    if (q <= p[0][0]) return p[0][1];
    for (let i = 0; i < p.length - 1; i++) {
      const [q0, d0] = p[i], [q1, d1] = p[i + 1];
      if (q <= q1) return d0 + (d1 - d0) * (q - q0) / (q1 - q0);
    }
    return Math.max(0, p[p.length - 1][1]);
  }

  /** Largest flow on the pump curve (where its pressure reaches zero, or the last point). */
  function pumpMaxFlow(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0]);
    return p.length ? p[p.length - 1][0] : 0;
  }

  /** Rest-of-loop pressure drop, quadratic in flow through a reference point. */
  function loopDp(pump, q) {
    return pump.extQ > 0 ? pump.extDp * (q / pump.extQ) ** 2 : 0;
  }

  /** Plate + loop pressure drop at volume flow q (inlet conditions). */
  function systemDp(s, q, opts) {
    const r = solve(Object.assign({}, s, { flowMode: 'vol', flow: q }), opts);
    return { plate: r.ok ? r.dp : NaN, loop: loopDp(s.pump, q), res: r };
  }

  /**
   * Operating point: flow at which the pump pressure equals plate + loop
   * pressure drop. Solved by bisection on the volume flow.
   */
  function operatingPoint(s, opts = {}) {
    const pts = (s.pump && s.pump.points) || [];
    if (pts.length < 2) return { ok: false, msg: 'Enter at least two pump curve points.' };
    const qMax = pumpMaxFlow(pts);
    if (!(qMax > 0) || !(pumpDp(pts, 0) > 0)) return { ok: false, msg: 'The pump curve needs a positive shut-off pressure and flow.' };
    const f = (q) => { const d = systemDp(s, q, opts); return pumpDp(pts, q) - d.plate - d.loop; };
    let lo = qMax * 1e-4, hi = qMax;
    let flo = f(lo), fhi = f(hi);
    if (!isFinite(flo)) return { ok: false, msg: 'Plate geometry is invalid.' };
    if (flo <= 0) return { ok: false, msg: 'The pump cannot overcome the plate and loop pressure drop.' };
    if (fhi > 0) hi = qMax; // pump still has pressure at its last point: operate there
    else {
      for (let i = 0; i < 60; i++) {
        const mid = 0.5 * (lo + hi), fm = f(mid);
        if (fm > 0) lo = mid; else hi = mid;
        if (hi - lo < qMax * 1e-5) break;
      }
    }
    const q = fhi > 0 ? qMax : 0.5 * (lo + hi);
    const d = systemDp(s, q, opts);
    return { ok: true, q, dpPump: pumpDp(pts, q), dpPlate: d.plate, dpLoop: d.loop, qMax, frac: q / qMax, atEnd: fhi > 0 };
  }

  /** The state actually solved: with a pump, the flow comes from the operating point. */
  function effectiveState(s, opts) {
    if (s.flowSource !== 'pump') return { s, op: null };
    const op = operatingPoint(s, opts);
    if (!op.ok) return { s, op };
    return { s: Object.assign({}, s, { flowMode: 'vol', flow: op.q }), op };
  }

  const Physics = { solve, sweep, fluidProps, geometry, waterTsat, laminarFD, laminarFApp, laminarNu, turbulentF, turbulentNu, channelFlow, bendK,
    fill, M, channelHT, flowDistribution, pumpDp, pumpMaxFlow, loopDp, systemDp, operatingPoint, effectiveState };
  if (typeof module !== 'undefined' && module.exports) module.exports = Physics;
  else root.Physics = Physics;
})(typeof window !== 'undefined' ? window : globalThis);
