/*
 * 2D plate temperature model.
 *
 * The plate face is split into a finite-difference grid (x along length,
 * y along width). Each cell conducts in-plane to its neighbours through the
 * local solid thickness (plate thickness minus channel void). Cells under a
 * channel are linked to the coolant through the heated-face wall and the
 * convective film (h and fin-corrected wetted perimeter from the 1D model).
 * The coolant is marched along each channel path; plate and coolant are
 * solved alternately until the coolant temperatures stop changing.
 *
 * Heat enters either uniformly or through discrete rectangular sources.
 * Each source adds a thermal interface layer (TIM) and an optional
 * junction-to-case resistance to give case and junction temperatures.
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const Physics = isNode ? require('./physics.js') : root.Physics;
  const Data = isNode ? require('./data.js') : root.CPData;

  /** Channel centre-lines in plate coordinates (m), one polyline per parallel flow path. */
  function channelPaths(s, g) {
    const along = s.orient === 'length';
    const map = ([u, v]) => { if (s.mirror) v = g.span - v; return along ? [u, v] : [v, u]; };
    const m = s.margin;
    const paths = [];
    if (s.layout === 'serpentine') {
      const c = g.circuits, N = g.count, p = g.pitch;
      const u0 = m + c * p / 2, u1 = g.run - m - c * p / 2;
      const vpos = (pass, i) => m + ((pass % 2 === 0 ? i : c - 1 - i) + pass * c + 0.5) * p;
      for (let i = 0; i < c; i++) {
        const pts = [];
        for (let pass = 0; pass < N; pass++) {
          const v = vpos(pass, i), fwd = pass % 2 === 0;
          const ua = fwd ? u0 : u1, ub = fwd ? u1 : u0;
          pts.push([ua, v], [ub, v]);
          if (pass < N - 1) {
            const vn = vpos(pass + 1, i);
            const r = Math.abs(vn - v) / 2, vc = (v + vn) / 2, dir = fwd ? 1 : -1, sg = Math.sign(vn - v);
            for (let q = 1; q < 12; q++) {
              const th = -Math.PI / 2 + Math.PI * q / 12;
              pts.push([ub + dir * r * Math.cos(th), vc + sg * r * Math.sin(th)]);
            }
          }
        }
        // Lead channels between the ports (near the plate edge) and the first/last pass, as drawn.
        const uPort = Math.max(m / 2, s.portD / 2 + 0.001);
        const lastFwd = (N - 1) % 2 === 0;
        pts.unshift([uPort, vpos(0, i)]);
        pts.push([lastFwd ? g.run - uPort : uPort, vpos(N - 1, i)]);
        paths.push({ pts: pts.map(map), share: 1 / c });
      }
    } else {
      const uA = m + s.header, uB = g.run - m - s.header;
      for (let i = 0; i < g.count; i++) {
        const v = m + (i + 0.5) * g.pitch;
        paths.push({ pts: [[uA, v], [uB, v]].map(map), share: 1 / g.count });
      }
    }
    return paths;
  }

  /** Overlap length of [a0,a1] and [b0,b1]. */
  const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

  /**
   * Heat inputs as "parts": each heat source (or the uniform heat) with the plate cells it covers
   * and the fraction of its heat that enters each cell. Sources carry their TIM resistance R,
   * junction-to-case resistance and optional heat capacity C (component thermal mass).
   */
  function heatParts(s, grid, Qtotal) {
    const { nx, ny, dx, dy } = grid;
    const rect = (x0, x1, y0, y1) => {
      const idx = [], w = [];
      let A = 0;
      for (let j = Math.max(0, Math.floor(y0 / dy)); j < Math.min(ny, Math.ceil(y1 / dy)); j++) {
        const oy = overlap(y0, y1, j * dy, (j + 1) * dy);
        for (let i = Math.max(0, Math.floor(x0 / dx)); i < Math.min(nx, Math.ceil(x1 / dx)); i++) {
          const a = overlap(x0, x1, i * dx, (i + 1) * dx) * oy;
          if (a <= 0) continue;
          idx.push(j * nx + i); w.push(a); A += a;
        }
      }
      return { idx, w: w.map((a) => a / A), A };
    };
    if (s.heatArea === 'sources') {
      return (s.sources || []).map((src) => {
        const x0 = src.x - src.w / 2, y0 = src.y - src.h / 2;
        // Clip to the plate; the whole power enters through the part that sits on it.
        const cx0 = Math.max(0, x0), cx1 = Math.min(s.L, x0 + src.w), cy0 = Math.max(0, y0), cy1 = Math.min(s.W, y0 + src.h);
        const part = cx1 > cx0 && cy1 > cy0 ? rect(cx0, cx1, cy0, cy1) : { idx: [], w: [], A: 0 };
        const area = src.w * src.h;
        // TIM: bulk conduction t/k plus contact resistance at both faces, per unit area.
        const R = ((src.tim > 0 && src.kTim > 0 ? src.tim / src.kTim : 0) + (src.rcTim || 0)) / area;
        return Object.assign(part, { P: src.P, R, C: Math.max(0, src.cth || 0), coverage: part.A / area, src });
      });
    }
    const m = s.margin;
    const part = s.heatArea === 'channels' ? rect(m, s.L - m, m, s.W - m) : rect(0, s.L, 0, s.W);
    return [Object.assign(part, { P: Qtotal, R: 0, C: 0, coverage: 1, src: null })];
  }

  /** Jacobi-preconditioned conjugate gradient for the plate conduction system. */
  function cg(grid, A, b, x, tol, maxIt) {
    const n = b.length;
    const { nx } = grid;
    const { diag, gE, gN } = A;
    const r = new Float64Array(n), z = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n);
    const mul = (v, out) => {
      for (let k = 0; k < n; k++) out[k] = diag[k] * v[k];
      for (let k = 0; k < n; k++) {
        if (gE[k]) { const G = gE[k]; out[k] -= G * v[k + 1]; out[k + 1] -= G * v[k]; }
        if (gN[k]) { const G = gN[k]; out[k] -= G * v[k + nx]; out[k + nx] -= G * v[k]; }
      }
    };
    mul(x, Ap);
    let bn = 0;
    for (let k = 0; k < n; k++) { r[k] = b[k] - Ap[k]; z[k] = r[k] / diag[k]; p[k] = z[k]; bn += b[k] * b[k]; }
    bn = Math.sqrt(bn) || 1;
    let rz = 0;
    for (let k = 0; k < n; k++) rz += r[k] * z[k];
    let it = 0;
    for (; it < maxIt; it++) {
      let rn = 0;
      for (let k = 0; k < n; k++) rn += r[k] * r[k];
      if (Math.sqrt(rn) / bn < tol) break;
      mul(p, Ap);
      let pAp = 0;
      for (let k = 0; k < n; k++) pAp += p[k] * Ap[k];
      const alpha = rz / pAp;
      for (let k = 0; k < n; k++) { x[k] += alpha * p[k]; r[k] -= alpha * Ap[k]; }
      let rzNew = 0;
      for (let k = 0; k < n; k++) { z[k] = r[k] / diag[k]; rzNew += r[k] * z[k]; }
      const beta = rzNew / rz;
      rz = rzNew;
      for (let k = 0; k < n; k++) p[k] = z[k] + beta * p[k];
    }
    return it;
  }

  /**
   * Build the 2D plate model. `base` is the 1D result (Physics.solve) for the same
   * state; it supplies h, wetted perimeter, mass flow and fluid properties.
   */
  function buildModel(s, base, opts = {}) {
    const g = base.geometry;
    const maxCells = opts.maxCells || 6000;
    const d = Math.max(Math.sqrt(s.L * s.W / maxCells), 0.0005);
    const nx = Math.max(4, Math.round(s.L / d)), ny = Math.max(4, Math.round(s.W / d));
    const dx = s.L / nx, dy = s.W / ny, n = nx * ny;
    const grid = { nx, ny, dx, dy };
    const ks = base.ks;
    const cp = base.props.cp;
    const sources = s.heatArea === 'sources' ? (s.sources || []) : [];
    const Qtotal = s.heatArea === 'sources' ? sources.reduce((a, x) => a + x.P, 0) : (opts.Q !== undefined ? opts.Q : base.Q);

    // Channel samples: fluid nodes, plate coverage and plate↔fluid links.
    const paths = channelPaths(s, g);
    // Parallel layouts: each channel carries its own share of the flow (manifold model) and has its own h.
    if (base.dist && paths.length === base.dist.frac.length) paths.forEach((p, i) => { p.share = base.dist.frac[i] / paths.length; });
    const pathHT = paths.map((p) => (base.dist ? Physics.channelHT(s, g, ks, base.props, base.mdot * p.share) : { h: base.h, Peff: base.Peff }));
    const cov = new Float64Array(n);
    const nodes = []; // { path, cells: [k...], G }
    const step = Math.min(dx, dy) / 2;
    const nw = Math.max(3, Math.ceil(g.a / Math.min(dx, dy)) * 2 + 1);
    const cellOf = (x, y) => {
      const i = Math.min(nx - 1, Math.max(0, Math.floor(x / dx)));
      const j = Math.min(ny - 1, Math.max(0, Math.floor(y / dy)));
      return j * nx + i;
    };
    const pathNodes = paths.map(() => []);
    paths.forEach((path, pi) => {
      for (let sgi = 0; sgi < path.pts.length - 1; sgi++) {
        const [x0, y0] = path.pts[sgi], [x1, y1] = path.pts[sgi + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len <= 0) continue;
        const m = Math.max(1, Math.ceil(len / step));
        const ds = len / m, tx = (x1 - x0) / len, ty = (y1 - y0) / len;
        const Gconv = pathHT[pi].h * pathHT[pi].Peff * ds;
        const Gwall = ks * g.a * ds / s.wallHeated;
        const G = 1 / (1 / Gconv + 1 / Gwall);
        for (let q = 0; q < m; q++) {
          const cx = x0 + tx * ds * (q + 0.5), cy = y0 + ty * ds * (q + 0.5);
          const cells = [];
          for (let w = 0; w < nw; w++) {
            const off = (w + 0.5) / nw * g.a - g.a / 2;
            const k = cellOf(cx - ty * off, cy + tx * off);
            cells.push(k);
            cov[k] += ds * g.a / nw / (dx * dy);
          }
          const node = { cells, G: G / nw, pi };
          nodes.push(node);
          pathNodes[pi].push(node);
        }
      }
    });

    // Parallel layouts: the inlet and outlet headers also cool the plate above them.
    const headers = [];
    const voidH = new Float64Array(n);
    if (s.layout !== 'serpentine') {
      const hd = s.headerDepth > 0 ? s.headerDepth : g.b;
      const hw = s.header, m = s.margin;
      const pr = base.props;
      const Ah = hw * hd, Dhh = 2 * hw * hd / (hw + hd);
      const vh = base.mdot / 2 / (pr.rho * Ah);
      const Reh = Math.max(1, pr.rho * vh * Dhh / pr.mu);
      const fl = Physics.channelFlow('rect', Math.min(hw, hd) / Math.max(hw, hd), Reh, base.Pr, Dhh, g.span - 2 * m, s.roughness / Dhh);
      const hh = fl.Nu * pr.k / Dhh;
      const along = s.orient === 'length';
      const rect = (u0, u1) => (along ? [u0, u1, m, g.span - m] : [m, g.span - m, u0, u1]);
      for (const [u0, u1] of [[m, m + hw], [g.run - m - hw, g.run - m]]) {
        let [x0, x1, y0, y1] = rect(u0, u1);
        if (s.mirror && !along) { [x0, x1] = [s.L - x1, s.L - x0]; }
        if (s.mirror && along) { [y0, y1] = [s.W - y1, s.W - y0]; }
        const hdr = { cells: [], g: [] };
        for (let j = Math.max(0, Math.floor(y0 / dy)); j < Math.min(ny, Math.ceil(y1 / dy)); j++) {
          const oy = overlap(y0, y1, j * dy, (j + 1) * dy);
          for (let i = Math.max(0, Math.floor(x0 / dx)); i < Math.min(nx, Math.ceil(x1 / dx)); i++) {
            const a = overlap(x0, x1, i * dx, (i + 1) * dx) * oy;
            if (a <= 0) continue;
            const k = j * nx + i;
            hdr.cells.push(k);
            hdr.g.push(1 / (1 / (hh * a) + s.wallHeated / (ks * a)));
            voidH[k] += hd * a / (dx * dy);
          }
        }
        headers.push(hdr);
      }
    }

    // Plate conduction conductances.
    const tcell = new Float64Array(n);
    for (let k = 0; k < n; k++) tcell[k] = Math.max(0.2 * s.t, s.t - g.b * Math.min(1, cov[k]) - voidH[k]);
    const diag = new Float64Array(n), gE = new Float64Array(n), gN = new Float64Array(n);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (i < nx - 1) { const G = 2 * ks / (1 / tcell[k] + 1 / tcell[k + 1]) * dy / dx; gE[k] = G; diag[k] += G; diag[k + 1] += G; }
        if (j < ny - 1) { const G = 2 * ks / (1 / tcell[k] + 1 / tcell[k + nx]) * dx / dy; gN[k] = G; diag[k] += G; diag[k + nx] += G; }
      }
    }
    for (const nd of nodes) for (const k of nd.cells) diag[k] += nd.G;
    for (const hdr of headers) hdr.cells.forEach((k, i) => { diag[k] += hdr.g[i]; });

    const parts = heatParts(s, grid, Qtotal);
    nodes.forEach((nd, i) => { nd.idx = i; });
    const mat = Data.MATERIALS[s.material];
    const rhoS = s.material === 'custom' ? s.rhoCustom : mat.rho;
    const cpS = s.material === 'custom' ? (s.cpCustom || mat.cp) : mat.cp;
    const Ccell = new Float64Array(n);
    for (let k = 0; k < n; k++) Ccell[k] = rhoS * cpS * tcell[k] * dx * dy;
    let diagDt = null, lastDt = null;
    return {
      s, base, g, grid, n, nx, ny, dx, dy, ks, cp, Qtotal, paths, pathNodes, nodes, headers, parts, tcell, Ccell,
      diag, gE, gN, Ctot: base.mdot * cp,
      /** System diagonal including the heat capacity term C/dt (cached per time step). */
      diagFor(dt) {
        if (!isFinite(dt)) return diag;
        if (dt !== lastDt) { diagDt = new Float64Array(n); for (let k = 0; k < n; k++) diagDt[k] = diag[k] + Ccell[k] / dt; lastDt = dt; }
        return diagDt;
      },
    };
  }

  /** Fresh model state at the coolant inlet temperature. */
  function initState(M) {
    const Tin = M.s.Tin, np = M.parts.length;
    return {
      T: new Float64Array(M.n).fill(Tin), Tf: new Float64Array(M.nodes.length).fill(Tin),
      Ts: new Float64Array(np).fill(Tin), Qs: new Float64Array(np), Tbar: new Float64Array(np).fill(Tin), slope: new Float64Array(np),
      TinCh: Tin, Tmix: Tin, ToutAll: Tin, outer: 0, cgIts: 0,
    };
  }

  /**
   * Solve the plate and coolant for heat factor f (multiplies every heat input).
   * dt = Infinity: steady state. Finite dt: one backward-Euler step from `prev`
   * (plate heat capacity per cell, component heat capacity per source; the
   * coolant is quasi-steady because it passes through the plate quickly).
   */
  function relax(M, st, f, dt, prev) {
    const { s, n, nodes, pathNodes, paths, headers, parts, Ccell, Ctot, cp, base } = M;
    const trans = isFinite(dt);
    const A = { diag: M.diagFor(dt), gE: M.gE, gN: M.gN };
    const b = new Float64Array(n);
    const T = st.T, Tf = st.Tf;
    const hdrHeat = (hdr, Tfl) => hdr.cells.reduce((a, k, i) => a + hdr.g[i] * (T[k] - Tfl), 0);
    const Qmeas = new Float64Array(parts.length), Tmeas = new Float64Array(parts.length);
    let outer = 0;
    for (; outer < 120; outer++) {
      // Heat each part delivers to the plate. A component with heat capacity C stores part of its power:
      // C (Ts − Ts,old)/dt = P − Qs and Qs = (Ts − T̄)/R, where T̄ is the mean plate temperature under it.
      let dQ = 0;
      parts.forEach((p, i) => {
        let Tbar = 0;
        for (let j = 0; j < p.idx.length; j++) Tbar += p.w[j] * T[p.idx[j]];
        const P = f * p.P;
        let Qs = P;
        if (trans && p.C > 0) {
          // T̄ responds to Qs; use the slope measured between iterations (secant) for a Newton-like update.
          if (outer > 0 && Math.abs(st.Qs[i] - Qmeas[i]) > 1e-9 * (Math.abs(P) + 1)) {
            const sl = (Tbar - Tmeas[i]) / (st.Qs[i] - Qmeas[i]);
            if (sl > 0 && isFinite(sl)) st.slope[i] = sl;
          } else if (outer === 0 && !(st.slope[i] > 0)) {
            let Cf = 0;
            for (const k of p.idx) Cf += Ccell[k];
            st.slope[i] = dt / Math.max(Cf, 1e-9);
          }
          Qmeas[i] = st.Qs[i]; Tmeas[i] = Tbar;
          const sl = st.slope[i], a = p.C / dt;
          Qs = (a * (prev.Ts[i] - Tbar + sl * st.Qs[i]) + P) / (1 + a * p.R + a * sl);
        }
        dQ = Math.max(dQ, Math.abs(Qs - st.Qs[i]) / (Math.abs(P) + 1e-9));
        st.Qs[i] = Qs; st.Tbar[i] = Tbar;
        st.Ts[i] = Tbar + Qs * p.R;
      });
      b.fill(0);
      parts.forEach((p, i) => { for (let j = 0; j < p.idx.length; j++) b[p.idx[j]] += st.Qs[i] * p.w[j]; });
      for (const nd of nodes) for (const k of nd.cells) b[k] += nd.G * Tf[nd.idx];
      if (headers.length) {
        headers[0].cells.forEach((k, i) => { b[k] += headers[0].g[i] * s.Tin; });
        headers[1].cells.forEach((k, i) => { b[k] += headers[1].g[i] * st.Tmix; });
      }
      if (trans) for (let k = 0; k < n; k++) b[k] += Ccell[k] / dt * prev.T[k];
      st.cgIts += cg(M.grid, A, b, T, 1e-8, 4000);
      let change = 0;
      // Heat picked up in the inlet header warms the coolant before it enters the channels.
      if (headers.length) st.TinCh = s.Tin + hdrHeat(headers[0], s.Tin) / Ctot;
      pathNodes.forEach((pn, pi) => {
        const C = base.mdot * paths[pi].share * cp;
        let tf = st.TinCh;
        for (const nd of pn) {
          let Qn = 0;
          for (const k of nd.cells) Qn += nd.G * (T[k] - tf);
          change = Math.max(change, Math.abs(Tf[nd.idx] - tf));
          Tf[nd.idx] = tf;
          tf += Qn / C;
        }
        paths[pi].Tout = tf;
      });
      const TmixNew = paths.reduce((a, p) => a + p.share * p.Tout, 0);
      change = Math.max(change, Math.abs(TmixNew - st.Tmix));
      st.Tmix = TmixNew;
      st.ToutAll = headers.length ? st.Tmix + hdrHeat(headers[1], st.Tmix) / Ctot : st.Tmix;
      if (change < 1e-5 && dQ < 1e-6 && outer > 0) break;
    }
    st.outer += outer;
    return st;
  }

  /** Steady 2D solution (see buildModel). */
  function solve2D(s, base, opts = {}) {
    if (!base || !base.ok) return null;
    const M = buildModel(s, base, opts);
    const st = relax(M, initState(M), 1, Infinity);
    return results(M, st);
  }

  /** Temperatures, component results and energy balance of a solved state. */
  function results(M, st, f = 1) {
    const { s, grid, n, nx, ny, dx, dy, paths, parts, Ctot } = M;
    const T = st.T;
    const Qtotal = f * M.Qtotal;
    const Qin = st.Qs.reduce((a, v) => a + v, 0);
    const outer = st.outer, cgIts = st.cgIts;
    const sources = s.heatArea === 'sources' ? (s.sources || []) : [];
    const coverage = parts.map((p) => p.coverage);
    const ToutAll = st.ToutAll;
    let Tmax = -Infinity, Tmin = Infinity, imax = 0;
    for (let k = 0; k < n; k++) { if (T[k] > Tmax) { Tmax = T[k]; imax = k; } if (T[k] < Tmin) Tmin = T[k]; }
    const Tout = ToutAll;
    const QtoFluid = Ctot * (Tout - s.Tin);
    const hottest = { x: (imax % nx + 0.5) * dx, y: (Math.floor(imax / nx) + 0.5) * dy };

    const srcRes = sources.map((src, si) => {
      const x0 = src.x - src.w / 2, y0 = src.y - src.h / 2;
      let sumA = 0, sumT = 0, tmax = -Infinity;
      for (let j = Math.max(0, Math.floor(y0 / dy)); j < Math.min(ny, Math.ceil((y0 + src.h) / dy)); j++) {
        const oy = overlap(y0, y0 + src.h, j * dy, (j + 1) * dy);
        for (let i = Math.max(0, Math.floor(x0 / dx)); i < Math.min(nx, Math.ceil((x0 + src.w) / dx)); i++) {
          const a = overlap(x0, x0 + src.w, i * dx, (i + 1) * dx) * oy;
          if (a <= 0) continue;
          const t = T[j * nx + i];
          sumA += a; sumT += a * t; tmax = Math.max(tmax, t);
        }
      }
      const Tplate = sumA > 0 ? sumT / sumA : NaN;
      // Heat through the TIM: the full power in steady state, less while a component's own mass is heating up.
      const P = f * src.P, Qs = st.Qs[si], Rtim = parts[si].R;
      const Tcase = Tplate + Qs * Rtim;
      const Tj = Tcase + P * (src.rjc || 0);
      return { name: src.name, P, Tplate, TplateMax: tmax, Rtim, dTtim: Qs * Rtim, Tcase, Tj, limit: src.Tlimit, margin: src.Tlimit - Tj, onPlate: coverage[si] };
    });

    // Linear in heat (properties fixed): factor by which all sources can be scaled before the first hits its limit.
    let headroom = null;
    if (srcRes.length) {
      headroom = Math.min(...srcRes.map((r) => (r.limit - s.Tin) / Math.max(1e-9, r.Tj - s.Tin)));
    }

    return { grid, T, Tmin, Tmax, hottest, Qin, QtoFluid, Tout, sources: srcRes, headroom, outer, cgIts, paths, Qtotal };
  }

  /** n time steps over dur, growing geometrically from dur·first (resolves fast and slow responses). */
  function stepSizes(dur, n, first) {
    if (!(dur > 0)) return [];
    const dt0 = dur * first;
    if (dt0 * n >= dur) return new Array(n).fill(dur / n);
    let lo = 1, hi = 10;
    for (let i = 0; i < 60; i++) { const r = (lo + hi) / 2; if (dt0 * (Math.pow(r, n) - 1) / (r - 1) > dur) hi = r; else lo = r; }
    const r = (lo + hi) / 2, out = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const d = i === n - 1 ? dur - sum : dt0 * Math.pow(r, i); out.push(d); sum += d; }
    return out;
  }

  /** Plate and source temperatures of a state, for the transient record. */
  function snapshot(M, st, f) {
    const T = st.T, n = M.n;
    let Tmax = -Infinity;
    for (let k = 0; k < n; k++) if (T[k] > Tmax) Tmax = T[k];
    const src = M.parts.map((p, i) => {
      let Tbar = 0;
      for (let j = 0; j < p.idx.length; j++) Tbar += p.w[j] * T[p.idx[j]];
      const Tcase = Tbar + st.Qs[i] * p.R;
      return p.src ? Tcase + f * p.P * (p.src.rjc || 0) : Tcase;
    });
    // Stored heat (relative to 0 °C) and heat flows, for the energy balance.
    let E = 0;
    for (let k = 0; k < n; k++) E += M.Ccell[k] * T[k];
    M.parts.forEach((p, i) => { E += p.C * st.Ts[i]; });
    const Pin = f * M.parts.reduce((a, p) => a + p.P, 0), Pout = M.Ctot * (st.ToutAll - M.s.Tin);
    return { Tmax, Tout: st.ToutAll, src, Q: st.Qs.reduce((a, v) => a + v, 0), E, Pin, Pout };
  }

  /**
   * Transient response to a load profile (generator: yields progress, returns the history).
   * profile: { f0, segments: [{ dur, f, n, first }] } — heat factors multiply the design heat load;
   * the plate starts in steady state at f0 (0 = at the coolant temperature).
   */
  function* transient(s, base, profile, opts = {}) {
    const M = buildModel(s, base, opts);
    const st = initState(M);
    if (profile.f0 > 0) relax(M, st, profile.f0, Infinity);
    const hist = { t: [0], f: [profile.f0], Tmax: [], Tout: [], src: M.parts.map(() => []), Q: [], E: [], Pin: [], Pout: [] };
    const rec = (f) => {
      const sn = snapshot(M, st, f);
      hist.Tmax.push(sn.Tmax); hist.Tout.push(sn.Tout); hist.Q.push(sn.Q); hist.E.push(sn.E); hist.Pin.push(sn.Pin); hist.Pout.push(sn.Pout);
      sn.src.forEach((v, i) => hist.src[i].push(v));
    };
    rec(profile.f0);
    const total = profile.segments.reduce((a, g) => a + g.n, 0);
    let t = 0, done = 0;
    for (const seg of profile.segments) {
      for (const dt of stepSizes(seg.dur, seg.n, seg.first)) {
        const prev = { T: st.T.slice(), Ts: st.Ts.slice() };
        relax(M, st, seg.f, dt, prev);
        t += dt;
        hist.t.push(t); hist.f.push(seg.f);
        rec(seg.f);
        done++;
        yield { done, total };
      }
    }
    // Heat capacities for reporting: plate (solid) and components.
    hist.Cplate = M.Ccell.reduce((a, v) => a + v, 0);
    hist.Csrc = M.parts.map((p) => p.C);
    hist.grid = M.grid;
    // Steady state at each distinct factor (what a sustained load would reach).
    hist.steady = {};
    for (const f of new Set([profile.f0, ...profile.segments.map((g) => g.f)])) {
      const s2 = initState(M);
      relax(M, s2, f, Infinity);
      hist.steady[f] = snapshot(M, s2, f);
    }
    return hist;
  }

  /** Run a transient to completion (Node and tests). */
  function runTransient(s, base, profile, opts) {
    const g = transient(s, base, profile, opts);
    for (;;) { const r = g.next(); if (r.done) return r.value; }
  }

  /**
   * Full 2D evaluation for the current state: runs the 1D model for
   * hydraulics/properties, then the 2D plate. In "capacity" mode with a
   * uniform heat input, the heat is scaled so the peak equals TsMax.
   */
  function evaluate(s, opts = {}) {
    // With discrete sources the 1D pass only supplies hydraulics and mean-temperature properties.
    const s1 = s.heatArea === 'sources'
      ? Object.assign({}, s, { mode: 'load', Q: (s.sources || []).reduce((a, x) => a + x.P, 0) })
      : s;
    const base = Physics.solve(s1, opts);
    if (!base.ok) return { base, map: null };
    let map;
    if (s.heatArea === 'sources') {
      map = solve2D(s, base, opts);
    } else {
      const Qnom = s.mode === 'capacity' ? base.Q : s.Q;
      map = solve2D(s, base, Object.assign({}, opts, { Q: Qnom }));
      if (map && s.mode === 'capacity' && map.Tmax > s.Tin) {
        // Plate temperatures rise linearly with heat at fixed properties.
        const f = (s.TsMax - s.Tin) / (map.Tmax - s.Tin);
        for (let k = 0; k < map.T.length; k++) map.T[k] = s.Tin + (map.T[k] - s.Tin) * f;
        map.Tmax = s.Tin + (map.Tmax - s.Tin) * f;
        map.Tmin = s.Tin + (map.Tmin - s.Tin) * f;
        map.Tout = s.Tin + (map.Tout - s.Tin) * f;
        map.paths.forEach((p) => { p.Tout = s.Tin + (p.Tout - s.Tin) * f; });
        map.Qin *= f; map.QtoFluid *= f; map.Qtotal *= f;
      }
    }
    return { base, map };
  }

  const Physics2D = { channelPaths, solve2D, evaluate, buildModel, initState, relax, results, stepSizes, transient, runTransient };
  if (isNode) module.exports = Physics2D;
  else root.Physics2D = Physics2D;
})(typeof window !== 'undefined' ? window : globalThis);
