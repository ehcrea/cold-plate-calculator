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

  const FLUIDS = Object.assign({}, LIQUIDS, GASES);

  // Plate materials: k W/m·K, rho kg/m³, max recommended coolant velocity m/s (erosion guide).
  const MATERIALS = {
    al6061: { name: 'Aluminium 6061-T6', k: 167, rho: 2700, vmax: 2.5, family: 'al' },
    al6063: { name: 'Aluminium 6063-T5 (extrusion)', k: 209, rho: 2700, vmax: 2.5, family: 'al' },
    al3003: { name: 'Aluminium 3003 (brazed)', k: 193, rho: 2730, vmax: 2.5, family: 'al' },
    al1100: { name: 'Aluminium 1100', k: 222, rho: 2710, vmax: 2.5, family: 'al' },
    cu110: { name: 'Copper C110 (ETP)', k: 388, rho: 8940, vmax: 2.0, family: 'cu' },
    cu101: { name: 'Copper C101 (OFE)', k: 391, rho: 8940, vmax: 2.0, family: 'cu' },
    ss304: { name: 'Stainless steel 304', k: 16.2, rho: 8000, vmax: 6.0, family: 'ss' },
    ss316: { name: 'Stainless steel 316L', k: 16.3, rho: 8000, vmax: 6.0, family: 'ss' },
    ti2: { name: 'Titanium Grade 2', k: 16.4, rho: 4510, vmax: 6.0, family: 'ti' },
    custom: { name: 'Custom…', k: 150, rho: 2700, vmax: 3.0, family: 'custom' },
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
        mode: 'capacity', TsMax: 75, Q: 2000, heatArea: 'full',
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
        mode: 'load', TsMax: 35, Q: 800, heatArea: 'full',
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
      },
    },
  };

  const Data = { LIQUIDS, GASES, FLUIDS, MATERIALS, PRESETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Data;
  else root.CPData = Data;
})(typeof window !== 'undefined' ? window : globalThis);
