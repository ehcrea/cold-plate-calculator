/*
 * Unit conversion. All calculations run in SI; this module converts between
 * SI base values and the displayed unit for the active unit system.
 *
 * Each quantity defines, per system, a label and toDisplay / fromDisplay
 * functions. Temperatures are stored internally in °C.
 */
(function (root) {
  'use strict';

  const linear = (label, factor, offset = 0) => ({
    label,
    toDisplay: (si) => si * factor + offset,
    fromDisplay: (d) => (d - offset) / factor,
  });

  // Molar flow per standard volume flow unit.
  // SLPM: 0 °C, 1.01325 bar.  SCFM: 68 °F (20 °C), 14.696 psia.
  const R = 8.314462618;
  const MOL_PER_SLPM = (1e-3 / 60) * 101325 / (R * 273.15);
  const MOL_PER_SCFM = (0.028316846592 / 60) * 101325 / (R * 293.15);

  const QUANTITIES = {
    // internal SI unit           SI display                          Imperial display
    length:      { si: 'm',       SI: linear('mm', 1e3),              IMP: linear('in', 1 / 0.0254) },
    roughness:   { si: 'm',       SI: linear('µm', 1e6),              IMP: linear('µin', 1 / 0.0254e-6) },
    temp:        { si: '°C',      SI: linear('°C', 1),                IMP: linear('°F', 1.8, 32) },
    dtemp:       { si: 'K',       SI: linear('K', 1),                 IMP: linear('°F', 1.8) },
    volflow:     { si: 'm³/s',    SI: linear('L/min', 60e3),          IMP: linear('gpm', 60 / 0.003785411784) },
    stdflow:     { si: 'mol/s',   SI: linear('SLPM', 1 / MOL_PER_SLPM), IMP: linear('SCFM', 1 / MOL_PER_SCFM) },
    massflow:    { si: 'kg/s',    SI: linear('g/s', 1e3),             IMP: linear('lb/min', 60 / 0.45359237) },
    pressure:    { si: 'Pa',      SI: linear('bar(a)', 1e-5),         IMP: linear('psia', 1 / 6894.757) },
    dpressure:   { si: 'Pa',      SI: linear('kPa', 1e-3),            IMP: linear('psi', 1 / 6894.757) },
    power:       { si: 'W',       SI: linear('W', 1),                 IMP: linear('W', 1) },
    powerAlt:    { si: 'W',       SI: linear('kW', 1e-3),             IMP: linear('BTU/h', 3.412142) },
    velocity:    { si: 'm/s',     SI: linear('m/s', 1),               IMP: linear('ft/s', 1 / 0.3048) },
    htc:         { si: 'W/m²K',   SI: linear('W/m²·K', 1),            IMP: linear('BTU/h·ft²·°F', 1 / 5.678263) },
    impedance:   { si: 'm²K/W',   SI: linear('K·cm²/W', 1e4),         IMP: linear('°F·in²/W', 1.8 / 0.00064516) },
    rth:         { si: 'K/W',     SI: linear('K/W', 1),               IMP: linear('°F/W', 1.8) },
    flux:        { si: 'W/m²',    SI: linear('W/cm²', 1e-4),          IMP: linear('W/in²', 0.00064516) },
    mass:        { si: 'kg',      SI: linear('kg', 1),                IMP: linear('lb', 1 / 0.45359237) },
    volume:      { si: 'm³',      SI: linear('mL', 1e6),              IMP: linear('in³', 1 / 1.6387064e-5) },
    area:        { si: 'm²',      SI: linear('cm²', 1e4),             IMP: linear('in²', 1 / 0.00064516) },
    conductivity:{ si: 'W/m·K',   SI: linear('W/m·K', 1),             IMP: linear('BTU/h·ft·°F', 1 / 1.730735) },
    density:     { si: 'kg/m³',   SI: linear('kg/m³', 1),             IMP: linear('lb/ft³', 1 / 16.01846) },
    cp:          { si: 'J/kg·K',  SI: linear('J/kg·K', 1),            IMP: linear('BTU/lb·°F', 1 / 4186.8) },
    viscosity:   { si: 'Pa·s',    SI: linear('mPa·s', 1e3),           IMP: linear('cP', 1e3) },
    power2:      { si: 'W',       SI: linear('W', 1),                 IMP: linear('hp', 1 / 745.6999) },
  };

  let system = 'SI';

  const Units = {
    QUANTITIES,
    MOL_PER_SLPM,
    get system() { return system; },
    setSystem(s) { system = s === 'IMP' ? 'IMP' : 'SI'; },
    label(q, sys = system) { return QUANTITIES[q][sys].label; },
    toDisplay(q, si, sys = system) { return QUANTITIES[q][sys].toDisplay(si); },
    fromDisplay(q, d, sys = system) { return QUANTITIES[q][sys].fromDisplay(d); },
    /** Format an SI value in the active system with a sensible number of significant digits. */
    format(q, si, opts = {}) {
      if (si === null || si === undefined || !isFinite(si)) return '—';
      const v = Units.toDisplay(q, si, opts.system || system);
      const unit = opts.noUnit ? '' : ' ' + Units.label(q, opts.system || system);
      return Units.fmtNumber(v, opts.digits) + unit;
    },
    fmtNumber(v, digits) {
      if (!isFinite(v)) return '—';
      const a = Math.abs(v);
      let d = digits;
      if (d === undefined) d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.01 ? 3 : 4;
      if (a >= 1e6 || (a > 0 && a < 1e-4)) return v.toExponential(2);
      return v.toLocaleString((root.I18N && root.I18N.locale) || 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Units;
  else root.Units = Units;
})(typeof window !== 'undefined' ? window : globalThis);
