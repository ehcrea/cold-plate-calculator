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

  /** Heat input per cell [W] for the chosen heat distribution. */
  function heatInput(s, g, grid, Qtotal) {
    const { nx, ny, dx, dy } = grid;
    const q = new Float64Array(nx * ny);
    const addRect = (x0, x1, y0, y1, P) => {
      const A = (x1 - x0) * (y1 - y0);
      if (!(A > 0)) return 0;
      let placed = 0;
      for (let j = Math.max(0, Math.floor(y0 / dy)); j < Math.min(ny, Math.ceil(y1 / dy)); j++) {
        const oy = overlap(y0, y1, j * dy, (j + 1) * dy);
        for (let i = Math.max(0, Math.floor(x0 / dx)); i < Math.min(nx, Math.ceil(x1 / dx)); i++) {
          const a = overlap(x0, x1, i * dx, (i + 1) * dx) * oy;
          q[j * nx + i] += P * a / A;
          placed += a;
        }
      }
      return placed / A;
    };
    const coverage = [];
    if (s.heatArea === 'sources') {
      for (const src of s.sources || []) {
        const x0 = src.x - src.w / 2, y0 = src.y - src.h / 2;
        // Clip to the plate; power is scaled to the part that sits on the plate.
        const cx0 = Math.max(0, x0), cx1 = Math.min(s.L, x0 + src.w), cy0 = Math.max(0, y0), cy1 = Math.min(s.W, y0 + src.h);
        const frac = Math.max(0, cx1 - cx0) * Math.max(0, cy1 - cy0) / (src.w * src.h);
        addRect(cx0, cx1, cy0, cy1, src.P);
        coverage.push(frac);
      }
    } else if (s.heatArea === 'channels') {
      const m = s.margin;
      addRect(m, s.L - m, m, s.W - m, Qtotal);
    } else {
      addRect(0, s.L, 0, s.W, Qtotal);
    }
    return { q, coverage };
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
   * Solve the 2D plate. `base` is the 1D result (Physics.solve) for the same
   * state; it supplies h, wetted perimeter, mass flow and fluid properties.
   */
  function solve2D(s, base, opts = {}) {
    if (!base || !base.ok) return null;
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
    const hdrHeat = (hdr, Tfl) => hdr.cells.reduce((a, k, i) => a + hdr.g[i] * (T[k] - Tfl), 0);

    const { q, coverage } = heatInput(s, g, grid, Qtotal);
    const Qin = q.reduce((a, v) => a + v, 0);

    // Alternate plate solve and coolant march.
    const T = new Float64Array(n).fill(s.Tin);
    const Tf = new Float64Array(nodes.length).fill(s.Tin);
    nodes.forEach((nd, i) => { nd.idx = i; });
    const b = new Float64Array(n);
    const Ctot = base.mdot * cp;
    let outer = 0, cgIts = 0, TinCh = s.Tin, Tmix = s.Tin, ToutAll = s.Tin;
    for (; outer < 80; outer++) {
      b.set(q);
      for (const nd of nodes) for (const k of nd.cells) b[k] += nd.G * Tf[nd.idx];
      if (headers.length) {
        headers[0].cells.forEach((k, i) => { b[k] += headers[0].g[i] * s.Tin; });
        headers[1].cells.forEach((k, i) => { b[k] += headers[1].g[i] * Tmix; });
      }
      cgIts += cg(grid, { diag, gE, gN }, b, T, 1e-8, 4000);
      let change = 0;
      // Heat picked up in the inlet header warms the coolant before it enters the channels.
      if (headers.length) TinCh = s.Tin + hdrHeat(headers[0], s.Tin) / Ctot;
      pathNodes.forEach((pn, pi) => {
        const C = base.mdot * paths[pi].share * cp;
        let tf = TinCh;
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
      change = Math.max(change, Math.abs(TmixNew - Tmix));
      Tmix = TmixNew;
      ToutAll = headers.length ? Tmix + hdrHeat(headers[1], Tmix) / Ctot : Tmix;
      if (change < 1e-5 && outer > 0) break;
    }

    // Results.
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
      const area = src.w * src.h;
      const Tplate = sumA > 0 ? sumT / sumA : NaN;
      // TIM: bulk conduction t/k plus contact resistance at both faces, per unit area.
      const Rtim = ((src.tim > 0 && src.kTim > 0 ? src.tim / src.kTim : 0) + (src.rcTim || 0)) / area;
      const Tcase = Tplate + src.P * Rtim;
      const Tj = Tcase + src.P * (src.rjc || 0);
      return { name: src.name, P: src.P, Tplate, TplateMax: tmax, Rtim, dTtim: src.P * Rtim, Tcase, Tj, limit: src.Tlimit, margin: src.Tlimit - Tj, onPlate: coverage[si] };
    });

    // Linear in heat (properties fixed): factor by which all sources can be scaled before the first hits its limit.
    let headroom = null;
    if (srcRes.length) {
      headroom = Math.min(...srcRes.map((r) => (r.limit - s.Tin) / Math.max(1e-9, r.Tj - s.Tin)));
    }

    return { grid, T, Tmin, Tmax, hottest, Qin, QtoFluid, Tout, sources: srcRes, headroom, outer, cgIts, paths, Qtotal };
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

  const Physics2D = { channelPaths, solve2D, evaluate };
  if (isNode) module.exports = Physics2D;
  else root.Physics2D = Physics2D;
})(typeof window !== 'undefined' ? window : globalThis);
