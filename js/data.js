/*
 * Property data for coolants and plate materials, plus application presets.
 * All values SI. Temperatures in °C unless noted.
 *
 * Liquid tables are engineering approximations (±5–10 %) compiled from
 * standard handbook data (water: IAPWS/Incropera; glycol mixtures: ASHRAE
 * Handbook – Fundamentals, concentrations by volume). Gas properties use the
 * ideal-gas law with Sutherland viscosity and power-law conductivity fits.
 */
(function (root) {
  'use strict';

  // Liquid rows: [T °C, rho kg/m³, cp J/kg·K, k W/m·K, mu mPa·s]
  const LIQUIDS = {
    water: {
      name: 'Water (DI)', short: 'Water', phase: 'liquid', freeze: 0, boilOffset: 0,
      rows: [
        [0, 999.8, 4217, 0.561, 1.792], [10, 999.7, 4192, 0.580, 1.307],
        [20, 998.2, 4182, 0.598, 1.002], [30, 995.7, 4178, 0.615, 0.798],
        [40, 992.2, 4179, 0.631, 0.653], [50, 988.0, 4181, 0.644, 0.547],
        [60, 983.2, 4185, 0.654, 0.466], [70, 977.8, 4190, 0.663, 0.404],
        [80, 971.8, 4197, 0.670, 0.354], [90, 965.3, 4205, 0.675, 0.315],
        [100, 958.4, 4216, 0.679, 0.282],
      ],
    },
    eg30: {
      name: 'Ethylene glycol 30 % (vol)', short: 'EG 30 %', phase: 'liquid', freeze: -15, boilOffset: 3,
      rows: [
        [-10, 1052, 3660, 0.420, 4.8], [0, 1050, 3700, 0.435, 3.4], [20, 1043, 3760, 0.460, 2.0],
        [40, 1034, 3820, 0.478, 1.27], [60, 1024, 3880, 0.492, 0.88], [80, 1013, 3940, 0.502, 0.66],
        [100, 1001, 4000, 0.508, 0.51],
      ],
    },
    eg50: {
      name: 'Ethylene glycol 50 % (vol)', short: 'EG 50 %', phase: 'liquid', freeze: -37, boilOffset: 7,
      rows: [
        [-30, 1090, 3150, 0.355, 30], [-20, 1087, 3190, 0.360, 17], [-10, 1084, 3230, 0.365, 10.5],
        [0, 1081, 3270, 0.370, 7.0], [20, 1072, 3340, 0.380, 3.8], [40, 1062, 3410, 0.388, 2.2],
        [60, 1050, 3480, 0.395, 1.45], [80, 1037, 3550, 0.400, 1.03], [100, 1023, 3620, 0.403, 0.77],
      ],
    },
    pg30: {
      name: 'Propylene glycol 30 % (vol)', short: 'PG 30 %', phase: 'liquid', freeze: -13, boilOffset: 2,
      rows: [
        [-10, 1035, 3880, 0.420, 8.5], [0, 1033, 3910, 0.435, 5.6], [20, 1027, 3960, 0.455, 2.8],
        [40, 1018, 4010, 0.470, 1.6], [60, 1007, 4060, 0.480, 1.0], [80, 994, 4110, 0.487, 0.72],
        [100, 980, 4160, 0.490, 0.55],
      ],
    },
    pg50: {
      name: 'Propylene glycol 50 % (vol)', short: 'PG 50 %', phase: 'liquid', freeze: -34, boilOffset: 6,
      rows: [
        [-30, 1066, 3400, 0.345, 110], [-20, 1062, 3440, 0.350, 50], [-10, 1058, 3480, 0.355, 25],
        [0, 1054, 3520, 0.360, 15], [20, 1045, 3600, 0.365, 6.5], [40, 1034, 3680, 0.370, 3.0],
        [60, 1021, 3760, 0.373, 1.8], [80, 1007, 3840, 0.375, 1.2], [100, 991, 3920, 0.376, 0.85],
      ],
    },
  };

  // Non-aqueous liquids: fixed boiling point at 1 atm (boil), pour/freeze point (freeze).
  // Dielectric fluids are safe in direct contact with electronics.
  Object.assign(LIQUIDS, {
    pao: {
      name: 'PAO (polyalphaolefin, avionics coolant)', short: 'PAO', phase: 'liquid', freeze: -60, boil: 250, dielectric: true,
      rows: [
        [-40, 830, 1960, 0.146, 207], [-20, 816, 2045, 0.144, 41], [0, 802, 2130, 0.142, 12.2], [20, 788, 2210, 0.140, 5.5],
        [40, 774, 2295, 0.138, 3.3], [60, 760, 2380, 0.137, 2.2], [80, 746, 2465, 0.135, 1.57], [100, 732, 2550, 0.134, 1.24],
      ],
    },
    mineraloil: {
      name: 'Mineral oil (transformer oil)', short: 'Mineral oil', phase: 'liquid', freeze: -40, boil: 280, dielectric: true,
      rows: [
        [-20, 906, 1720, 0.134, 140], [0, 893, 1790, 0.133, 40], [20, 880, 1860, 0.131, 18], [40, 867, 1930, 0.130, 9],
        [60, 854, 2000, 0.128, 5.2], [80, 841, 2070, 0.127, 3.4], [100, 828, 2140, 0.125, 2.4],
      ],
    },
    silicone: {
      name: 'Silicone oil (PDMS, 5 cSt)', short: 'Silicone oil', phase: 'liquid', freeze: -60, boil: 200, dielectric: true,
      rows: [
        [-40, 975, 1520, 0.128, 17.5], [0, 940, 1570, 0.124, 7.0], [25, 915, 1600, 0.121, 4.6], [50, 892, 1630, 0.118, 3.2],
        [100, 846, 1690, 0.112, 1.8],
      ],
    },
    pfpe: {
      name: 'PFPE dielectric fluid (bp ≈135 °C)', short: 'PFPE', phase: 'liquid', freeze: -100, boil: 135, dielectric: true,
      rows: [
        [-40, 1886, 900, 0.070, 8.5], [0, 1790, 940, 0.067, 3.2], [25, 1730, 966, 0.065, 1.73], [50, 1670, 990, 0.063, 1.15],
        [100, 1550, 1040, 0.059, 0.62],
      ],
    },
    hfe: {
      name: 'HFE dielectric fluid (bp ≈128 °C)', short: 'HFE', phase: 'liquid', freeze: -100, boil: 128, dielectric: true,
      rows: [
        [-40, 1780, 1020, 0.073, 5.2], [0, 1676, 1090, 0.068, 2.0], [25, 1614, 1128, 0.065, 1.24], [50, 1552, 1165, 0.062, 0.85],
        [100, 1430, 1240, 0.057, 0.50],
      ],
    },
    custom: {
      name: 'Custom liquid…', short: 'Custom liquid', phase: 'liquid', freeze: -50, boil: 100, custom: true,
      rows: [[-100, 1000, 4000, 0.6, 1], [400, 1000, 4000, 0.6, 1]],
    },
  });

  /** Constant-property custom liquid; cf = { rho, cp, k, mu (Pa·s), freeze, boil }. */
  function setCustomFluid(cf) {
    if (!cf) return;
    const f = LIQUIDS.custom;
    f.rows = [[-100, cf.rho, cf.cp, cf.k, cf.mu * 1e3], [400, cf.rho, cf.cp, cf.k, cf.mu * 1e3]];
    f.freeze = cf.freeze;
    f.boil = cf.boil;
  }
  const DEFAULT_CUSTOM_FLUID = { rho: 1000, cp: 3500, k: 0.4, mu: 0.003, freeze: -40, boil: 110 };

  // Gases: molar mass kg/mol, cp table [T K, cp J/kg·K], Sutherland (mu0 @ T0, S),
  // conductivity k = k0 (T/273.15)^n, ratio of specific heats gamma.
  const GASES = {
    air: {
      name: 'Clean dry air', short: 'Air', phase: 'gas', M: 0.028965, gamma: 1.40,
      cp: [[200, 1003], [250, 1003], [300, 1005], [350, 1008], [400, 1013], [450, 1020], [500, 1029]],
      mu0: 1.716e-5, S: 110.4, k0: 0.0241, kn: 0.81,
    },
    n2: {
      name: 'Nitrogen (N₂)', short: 'N₂', phase: 'gas', M: 0.0280134, gamma: 1.40,
      cp: [[200, 1039], [250, 1039], [300, 1040], [350, 1041], [400, 1045], [450, 1050], [500, 1056]],
      mu0: 1.663e-5, S: 106.7, k0: 0.0240, kn: 0.80,
    },
    h2: {
      name: 'Hydrogen (H₂)', short: 'H₂', phase: 'gas', M: 0.002016, gamma: 1.41,
      cp: [[200, 13540], [250, 14050], [300, 14310], [350, 14430], [400, 14480], [450, 14500], [500, 14520]],
      mu0: 8.411e-6, S: 97, k0: 0.168, kn: 0.80,
    },
  };

  Object.assign(GASES, {
    he: {
      name: 'Helium (He)', short: 'He', phase: 'gas', M: 0.0040026, gamma: 1.66,
      cp: [[200, 5193], [500, 5193]],
      mu0: 1.87e-5, S: 79.4, k0: 0.1434, kn: 0.71,
    },
    co2: {
      name: 'Carbon dioxide (CO₂)', short: 'CO₂', phase: 'gas', M: 0.04401, gamma: 1.29,
      cp: [[200, 735], [250, 791], [300, 846], [350, 895], [400, 939], [450, 978], [500, 1014]],
      mu0: 1.37e-5, S: 222, k0: 0.01465, kn: 1.33,
    },
  });

  const FLUIDS = Object.assign({}, LIQUIDS, GASES);

  // Thermal interface materials. k [W/m·K], typical bond-line thickness t [m],
  // contact resistance rc [m²·K/W] for both faces together. Typical datasheet-level values.
  const TIMS = {
    grease: { name: 'Thermal grease (standard)', k: 1.0, t: 50e-6, rc: 5e-6 },
    greaseHP: { name: 'Thermal grease (high performance)', k: 4.0, t: 30e-6, rc: 3e-6 },
    pcm: { name: 'Phase-change material', k: 3.0, t: 25e-6, rc: 4e-6 },
    graphite: { name: 'Graphite sheet', k: 8.0, t: 130e-6, rc: 10e-6 },
    adhesive: { name: 'Thermal adhesive / epoxy', k: 1.5, t: 100e-6, rc: 5e-6 },
    insulator: { name: 'Electrically insulating pad', k: 1.0, t: 230e-6, rc: 15e-6 },
    gappad: { name: 'Gap pad (soft, 1 mm)', k: 3.0, t: 1.0e-3, rc: 20e-6 },
    gapfiller: { name: 'Gap filler (dispensed, 1.5 mm)', k: 3.5, t: 1.5e-3, rc: 10e-6 },
    solder: { name: 'Solder (e.g. SAC / indium)', k: 50, t: 75e-6, rc: 1e-6 },
    custom: { name: 'Custom…', k: 3, t: 100e-6, rc: 0 },
  };

  // Plate materials: k W/m·K, rho kg/m³, max recommended coolant velocity m/s (erosion guide).
  const MATERIALS = {
    al6061: { name: 'Aluminium 6061-T6', k: 167, rho: 2700, cp: 896, vmax: 2.5, family: 'al' },
    al6063: { name: 'Aluminium 6063-T5 (extrusion)', k: 209, rho: 2700, cp: 900, vmax: 2.5, family: 'al' },
    al3003: { name: 'Aluminium 3003 (brazed)', k: 193, rho: 2730, cp: 893, vmax: 2.5, family: 'al' },
    al1100: { name: 'Aluminium 1100', k: 222, rho: 2710, cp: 904, vmax: 2.5, family: 'al' },
    cu110: { name: 'Copper C110 (ETP)', k: 388, rho: 8940, cp: 385, vmax: 2.0, family: 'cu' },
    cu101: { name: 'Copper C101 (OFE)', k: 391, rho: 8940, cp: 385, vmax: 2.0, family: 'cu' },
    ss304: { name: 'Stainless steel 304', k: 16.2, rho: 8000, cp: 500, vmax: 6.0, family: 'ss' },
    ss316: { name: 'Stainless steel 316L', k: 16.3, rho: 8000, cp: 500, vmax: 6.0, family: 'ss' },
    ti2: { name: 'Titanium Grade 2', k: 16.4, rho: 4510, cp: 523, vmax: 6.0, family: 'ti' },
    custom: { name: 'Custom…', k: 150, rho: 2700, cp: 900, vmax: 3.0, family: 'custom' },
  };

  const L_PER_MIN = 1e-3 / 60;

  // Application presets. Values in SI (m, °C, Pa, m³/s, kg/s, W).
  const PRESETS = {
    inverter: {
      name: 'Power electronics – inverter / IGBT cold plate',
      state: {
        W: 0.200, L: 0.300, t: 0.012, material: 'al6061',
        shape: 'rect', D: 0.006, cw: 0.010, cd: 0.006, wallHeated: 0.002, roughness: 3.2e-6,
        layout: 'serpentine', orient: 'length', count: 6, circuits: 1, margin: 0.010, header: 0.012, headerDepth: 0, portD: 0.010, mirror: false,
        fluid: 'eg50', pIn: 2.0e5, Tin: 50,
        flowMode: 'vol', flow: 8 * L_PER_MIN,
        mode: 'capacity', TsMax: 75, Q: 2000, heatArea: 'sources',
        sources: [
          { name: 'Phase U', P: 600, x: 0.065, y: 0.1, w: 0.05, h: 0.09, timType: 'grease', tim: 50e-6, kTim: 1.0, rcTim: 5e-6, rjc: 0.06, Tlimit: 150, cth: 120 },
          { name: 'Phase V', P: 600, x: 0.15, y: 0.1, w: 0.05, h: 0.09, timType: 'grease', tim: 50e-6, kTim: 1.0, rcTim: 5e-6, rjc: 0.06, Tlimit: 150, cth: 120 },
          { name: 'Phase W', P: 600, x: 0.235, y: 0.1, w: 0.05, h: 0.09, timType: 'grease', tim: 50e-6, kTim: 1.0, rcTim: 5e-6, rjc: 0.06, Tlimit: 150, cth: 120 },
        ],
      },
    },
    battery: {
      name: 'EV battery module – brazed cold plate',
      state: {
        W: 0.300, L: 0.600, t: 0.006, material: 'al3003',
        shape: 'rect', D: 0.004, cw: 0.012, cd: 0.002, wallHeated: 0.0015, roughness: 1.5e-6,
        layout: 'parallelZ', orient: 'length', count: 10, circuits: 1, margin: 0.010, header: 0.025, headerDepth: 0.0035, portD: 0.012, mirror: false,
        fluid: 'eg50', pIn: 1.8e5, Tin: 20,
        flowMode: 'vol', flow: 5 * L_PER_MIN,
        mode: 'load', TsMax: 35, Q: 800, heatArea: 'sources',
        sources: [
          { name: 'Module 1', P: 130, x: 0.11, y: 0.08, w: 0.17, h: 0.12, timType: 'gappad', tim: 0.001, kTim: 3, rcTim: 20e-6, rjc: 0, Tlimit: 45, cth: 3500 },
          { name: 'Module 2', P: 130, x: 0.3, y: 0.08, w: 0.17, h: 0.12, timType: 'gappad', tim: 0.001, kTim: 3, rcTim: 20e-6, rjc: 0, Tlimit: 45, cth: 3500 },
          { name: 'Module 3', P: 130, x: 0.49, y: 0.08, w: 0.17, h: 0.12, timType: 'gappad', tim: 0.001, kTim: 3, rcTim: 20e-6, rjc: 0, Tlimit: 45, cth: 3500 },
          { name: 'Module 4', P: 130, x: 0.11, y: 0.22, w: 0.17, h: 0.12, timType: 'gappad', tim: 0.001, kTim: 3, rcTim: 20e-6, rjc: 0, Tlimit: 45, cth: 3500 },
          { name: 'Module 5', P: 130, x: 0.3, y: 0.22, w: 0.17, h: 0.12, timType: 'gappad', tim: 0.001, kTim: 3, rcTim: 20e-6, rjc: 0, Tlimit: 45, cth: 3500 },
          { name: 'Module 6', P: 130, x: 0.49, y: 0.22, w: 0.17, h: 0.12, timType: 'gappad', tim: 0.001, kTim: 3, rcTim: 20e-6, rjc: 0, Tlimit: 45, cth: 3500 },
        ],
      },
    },
    fuelcell: {
      name: 'Fuel-cell stack / DC-DC cooling plate',
      state: {
        W: 0.250, L: 0.400, t: 0.010, material: 'ss316',
        shape: 'rect', D: 0.004, cw: 0.004, cd: 0.003, wallHeated: 0.0015, roughness: 1.5e-6,
        layout: 'parallelU', orient: 'length', count: 20, circuits: 1, margin: 0.012, header: 0.025, headerDepth: 0.006, portD: 0.016, mirror: false,
        fluid: 'water', pIn: 2.5e5, Tin: 65,
        flowMode: 'vol', flow: 10 * L_PER_MIN,
        mode: 'capacity', TsMax: 80, Q: 3000, heatArea: 'full',
        sources: [],
      },
    },
    hydrogen: {
      name: 'Hydrogen gas-cooled plate',
      state: {
        W: 0.150, L: 0.250, t: 0.012, material: 'al6061',
        shape: 'round', D: 0.008, cw: 0.008, cd: 0.008, wallHeated: 0.002, roughness: 1.5e-6,
        layout: 'serpentine', orient: 'length', count: 6, circuits: 1, margin: 0.010, header: 0.010, headerDepth: 0, portD: 0.010, mirror: false,
        fluid: 'h2', pIn: 5.0e5, Tin: 25,
        flowMode: 'mass', flow: 0.0005,
        mode: 'capacity', TsMax: 60, Q: 300, heatArea: 'full',
        sources: [],
      },
    },
    copper: {
      name: 'High-flux copper plate (SiC module / laser)',
      state: {
        W: 0.100, L: 0.150, t: 0.010, material: 'cu110',
        shape: 'rect', D: 0.004, cw: 0.0015, cd: 0.004, wallHeated: 0.0015, roughness: 1.5e-6,
        layout: 'parallelU', orient: 'length', count: 20, circuits: 1, margin: 0.008, header: 0.012, headerDepth: 0.007, portD: 0.010, mirror: false,
        fluid: 'water', pIn: 2.0e5, Tin: 25,
        flowMode: 'vol', flow: 4 * L_PER_MIN,
        mode: 'capacity', TsMax: 65, Q: 1500, heatArea: 'channels',
        sources: [],
      },
    },
  };

  // Generic pump / blower curves: dp = dp0 · (1 − (q/qmax)²), sampled at six points.
  const curve = (dp0, qmaxLpm) => [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => [f * qmaxLpm * L_PER_MIN, dp0 * (1 - f * f)]);
  const PUMPS = {
    // loop: a typical rest-of-loop pressure drop [Pa] at a reference flow [m³/s], used when switching between liquid and gas.
    smalldc: { name: 'Small 12 V DC pump (≈8 L/min, 0.4 bar)', points: curve(40e3, 8), gas: false },
    ev: { name: 'Automotive electric coolant pump (≈45 L/min, 1.5 bar)', points: curve(150e3, 45), gas: false },
    industrial: { name: 'Industrial centrifugal pump (≈120 L/min, 3 bar)', points: curve(300e3, 120), gas: false },
    blower: { name: 'Air / gas blower (≈1,500 L/min, 3 kPa)', points: curve(3e3, 1500), gas: true, loop: [0.5e3, 500 * L_PER_MIN] },
    h2blower: { name: 'H₂ recirculation blower (≈600 L/min, 30 kPa)', points: curve(30e3, 600), gas: true, loop: [5e3, 300 * L_PER_MIN] },
  };
  const DEFAULT_PUMP = { preset: 'ev', points: PUMPS.ev.points.map((p) => p.slice()), extDp: 20e3, extQ: 10 * L_PER_MIN };

  // ----- More application examples -----

  /** Heat source with a TIM from the library: src(name, W, [x, y] m, [length, width] m, timId, Rjc K/W, limit °C, TIM thickness?). */
  function src(name, P, [x, y], [w, h], timId, rjc, Tlimit, cth = 0) {
    const m = TIMS[timId];
    return { name, P, x, y, w, h, timType: timId, tim: m.t, kTim: m.k, rcTim: m.rc, rjc, Tlimit, cth };
  }
  const pumpOf = (id, extDp, extQlpm) => ({ preset: id, points: PUMPS[id].points.map((pt) => pt.slice()), extDp, extQ: extQlpm * L_PER_MIN });

  Object.assign(PRESETS, {
    obc: {
      name: 'EV on-board charger – SiC MOSFETs, transformer and inductor',
      state: {
        W: 0.180, L: 0.250, t: 0.010, material: 'al6061',
        shape: 'rect', D: 0.006, cw: 0.010, cd: 0.004, wallHeated: 0.002, roughness: 3.2e-6,
        layout: 'serpentine', orient: 'length', count: 4, circuits: 1, margin: 0.010, header: 0.012, headerDepth: 0, portD: 0.010, mirror: false,
        fluid: 'eg50', pIn: 2.0e5, Tin: 65,
        flowMode: 'vol', flow: 5 * L_PER_MIN,
        mode: 'capacity', TsMax: 90, Q: 600, heatArea: 'sources',
        sources: [
          src('Q1 SiC', 40, [0.045, 0.045], [0.016, 0.020], 'insulator', 0.35, 175),
          src('Q2 SiC', 40, [0.075, 0.045], [0.016, 0.020], 'insulator', 0.35, 175),
          src('Q3 SiC', 40, [0.045, 0.135], [0.016, 0.020], 'insulator', 0.35, 175),
          src('Q4 SiC', 40, [0.075, 0.135], [0.016, 0.020], 'insulator', 0.35, 175),
          src('Transformer', 80, [0.170, 0.090], [0.060, 0.050], 'gappad', 0, 130, 300),
          src('PFC inductor', 50, [0.215, 0.090], [0.040, 0.050], 'gappad', 0, 140, 200),
        ],
      },
    },
    drive: {
      name: 'Industrial drive – three IGBT modules, sized with a pump curve',
      state: {
        W: 0.300, L: 0.500, t: 0.020, material: 'al6063',
        shape: 'round', D: 0.010, cw: 0.010, cd: 0.010, wallHeated: 0.004, roughness: 3.2e-6,
        layout: 'parallelU', orient: 'length', count: 10, circuits: 1, margin: 0.015, header: 0.035, headerDepth: 0.016, portD: 0.022, mirror: false,
        fluid: 'eg30', pIn: 2.5e5, Tin: 40,
        flowMode: 'vol', flow: 20 * L_PER_MIN,
        flowSource: 'pump', pump: pumpOf('industrial', 120e3, 30),
        mode: 'capacity', TsMax: 80, Q: 6000, heatArea: 'sources',
        sources: [
          src('IGBT 1', 2200, [0.110, 0.150], [0.130, 0.140], 'greaseHP', 0.012, 150, 250),
          src('IGBT 2', 2200, [0.250, 0.150], [0.130, 0.140], 'greaseHP', 0.012, 150, 250),
          src('IGBT 3', 2200, [0.390, 0.150], [0.130, 0.140], 'greaseHP', 0.012, 150, 250),
        ],
      },
    },
    gpu: {
      name: 'Data centre – GPU / AI accelerator microchannel cold plate',
      state: {
        W: 0.090, L: 0.090, t: 0.008, material: 'cu101',
        shape: 'rect', D: 0.002, cw: 0.0005, cd: 0.003, wallHeated: 0.001, roughness: 1.5e-6,
        layout: 'parallelU', orient: 'length', count: 40, circuits: 1, margin: 0.006, header: 0.008, headerDepth: 0.004, portD: 0.008, mirror: false,
        fluid: 'pg30', pIn: 2.0e5, Tin: 35,
        flowMode: 'vol', flow: 1.5 * L_PER_MIN,
        mode: 'capacity', TsMax: 70, Q: 700, heatArea: 'sources',
        sources: [
          src('GPU', 700, [0.045, 0.045], [0.045, 0.045], 'greaseHP', 0.03, 95, 60),
        ],
      },
    },
    bess: {
      name: 'Stationary storage (BESS) module – bottom cold plate',
      state: {
        W: 0.250, L: 0.400, t: 0.005, material: 'al3003',
        shape: 'rect', D: 0.004, cw: 0.015, cd: 0.002, wallHeated: 0.0012, roughness: 1.5e-6,
        layout: 'parallelU', orient: 'length', count: 8, circuits: 1, margin: 0.008, header: 0.030, headerDepth: 0.0035, portD: 0.012, mirror: false,
        fluid: 'pg50', pIn: 1.5e5, Tin: 25,
        flowMode: 'vol', flow: 3 * L_PER_MIN,
        mode: 'load', TsMax: 35, Q: 240, heatArea: 'sources',
        sources: [
          src('Cells 1', 60, [0.105, 0.065], [0.180, 0.110], 'gappad', 0, 40, 6000),
          src('Cells 2', 60, [0.295, 0.065], [0.180, 0.110], 'gappad', 0, 40, 6000),
          src('Cells 3', 60, [0.105, 0.185], [0.180, 0.110], 'gappad', 0, 40, 6000),
          src('Cells 4', 60, [0.295, 0.185], [0.180, 0.110], 'gappad', 0, 40, 6000),
        ],
      },
    },
    rf: {
      name: 'GaN RF power amplifier – soldered transistors on copper',
      state: {
        W: 0.080, L: 0.120, t: 0.008, material: 'cu110',
        shape: 'rect', D: 0.002, cw: 0.001, cd: 0.003, wallHeated: 0.001, roughness: 1.5e-6,
        layout: 'parallelU', orient: 'length', count: 16, circuits: 1, margin: 0.008, header: 0.010, headerDepth: 0.005, portD: 0.008, mirror: false,
        fluid: 'water', pIn: 2.0e5, Tin: 25,
        flowMode: 'vol', flow: 3 * L_PER_MIN,
        mode: 'capacity', TsMax: 70, Q: 300, heatArea: 'sources',
        sources: [
          src('PA 1', 150, [0.040, 0.040], [0.020, 0.015], 'solder', 0.6, 225),
          src('PA 2', 150, [0.080, 0.040], [0.020, 0.015], 'solder', 0.6, 225),
        ],
      },
    },
    avionics: {
      name: 'Avionics chassis cold wall – PAO coolant',
      state: {
        W: 0.200, L: 0.300, t: 0.008, material: 'al6061',
        shape: 'rect', D: 0.004, cw: 0.010, cd: 0.003, wallHeated: 0.002, roughness: 3.2e-6,
        layout: 'serpentine', orient: 'length', count: 6, circuits: 1, margin: 0.010, header: 0.010, headerDepth: 0, portD: 0.008, mirror: false,
        fluid: 'pao', pIn: 3.0e5, Tin: 20,
        flowMode: 'vol', flow: 3.5 * L_PER_MIN,
        mode: 'capacity', TsMax: 70, Q: 320, heatArea: 'sources',
        sources: [
          src('Card A', 80, [0.060, 0.060], [0.060, 0.040], 'insulator', 0.15, 105, 150),
          src('Card B', 80, [0.150, 0.060], [0.060, 0.040], 'insulator', 0.15, 105, 150),
          src('Card C', 80, [0.060, 0.140], [0.060, 0.040], 'insulator', 0.15, 105, 150),
          src('PSU', 80, [0.150, 0.140], [0.060, 0.040], 'insulator', 0.15, 105, 200),
        ],
      },
    },
    aircooled: {
      name: 'Fuel-cell DC/DC – air-cooled plate with blower',
      state: {
        W: 0.150, L: 0.200, t: 0.016, material: 'al6063',
        shape: 'rect', D: 0.006, cw: 0.006, cd: 0.010, wallHeated: 0.003, roughness: 3.2e-6,
        layout: 'parallelU', orient: 'length', count: 10, circuits: 1, margin: 0.008, header: 0.025, headerDepth: 0.013, portD: 0.030, mirror: false,
        fluid: 'air', pIn: 1.013e5, Tin: 30,
        flowMode: 'vol', flow: 600 * L_PER_MIN,
        flowSource: 'pump', pump: pumpOf('blower', 0.5e3, 500),
        mode: 'capacity', TsMax: 85, Q: 200, heatArea: 'sources',
        sources: [
          src('Boost stage', 60, [0.070, 0.075], [0.050, 0.050], 'insulator', 0.2, 150),
          src('Diodes', 40, [0.140, 0.075], [0.040, 0.040], 'insulator', 0.3, 150),
        ],
      },
    },
  });

  // Groups for the preset picker.
  const PRESET_GROUPS = {
    inverter: 'Power electronics', obc: 'Power electronics', drive: 'Power electronics',
    gpu: 'Data centre & computing',
    battery: 'Battery & energy storage', bess: 'Battery & energy storage',
    fuelcell: 'Fuel cell & hydrogen', hydrogen: 'Fuel cell & hydrogen', aircooled: 'Fuel cell & hydrogen',
    copper: 'RF, lasers & high flux', rf: 'RF, lasers & high flux',
    avionics: 'Aerospace & defence',
  };
  for (const [id, gr] of Object.entries(PRESET_GROUPS)) PRESETS[id].group = gr;

  const Data = { LIQUIDS, GASES, FLUIDS, MATERIALS, PRESETS, PRESET_GROUPS, PUMPS, DEFAULT_PUMP, TIMS, setCustomFluid, DEFAULT_CUSTOM_FLUID };
  if (typeof module !== 'undefined' && module.exports) module.exports = Data;
  else root.CPData = Data;
})(typeof window !== 'undefined' ? window : globalThis);
