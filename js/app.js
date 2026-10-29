/*
 * UI controller: binds the form to an SI state object, runs the solver and
 * renders results, drawings and charts.
 */
(function () {
  'use strict';

  const { FLUIDS, LIQUIDS, GASES, MATERIALS, PRESETS } = CPData;
  const STORE_KEY = 'coldplate.v1';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let state = clone(PRESETS.inverter.state);
  let currentApp = PRESETS.inverter.name;
  state.kCustom = MATERIALS.custom.k;
  state.rhoCustom = MATERIALS.custom.rho;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  const isGas = () => FLUIDS[state.fluid].phase === 'gas';
  const flowQty = () => ({ vol: 'volflow', mass: 'massflow', std: 'stdflow' }[state.flowMode]);

  // ---------- Setup ----------

  function populateSelects() {
    const preset = $('#preset');
    for (const [id, p] of Object.entries(PRESETS)) preset.add(new Option(p.name, id));

    const mat = $('#material');
    for (const [id, m] of Object.entries(MATERIALS)) mat.add(new Option(m.name, id));

    const fl = $('#fluid');
    const groups = [['Liquids', LIQUIDS], ['Gases', GASES]];
    for (const [label, set] of groups) {
      const og = document.createElement('optgroup');
      og.label = label;
      for (const [id, f] of Object.entries(set)) og.appendChild(new Option(f.name, id));
      fl.appendChild(og);
    }
  }

  function displayNumber(v) {
    if (!isFinite(v)) return '';
    return String(+v.toPrecision(4));
  }

  /** Write state values into the form in the active unit system. */
  function renderInputs() {
    for (const inp of $$('[data-key]')) {
      const key = inp.dataset.key;
      const val = state[key];
      if (inp.type === 'checkbox') { inp.checked = !!val; continue; }
      if (inp.tagName === 'SELECT') { inp.value = val; continue; }
      const q = inp.dataset.q;
      inp.classList.remove('bad');
      if (key === 'headerDepth' && !(val > 0)) { inp.value = ''; continue; }
      if (q === 'int') inp.value = val;
      else if (q === 'flow') inp.value = displayNumber(Units.toDisplay(flowQty(), val));
      else inp.value = displayNumber(Units.toDisplay(q, val));
    }
    for (const span of $$('[data-unit]')) span.textContent = `(${Units.label(span.dataset.unit)})`;
    $('#flow-unit').textContent = `(${Units.label(flowQty())})`;
    syncControls();
  }

  /** Segmented controls, conditional fields and context hints. */
  function syncControls() {
    const setRadio = (group, attr, value) => $$(`#${group} [data-${attr}]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === value)));
    setRadio('units', 'units', Units.system);
    setRadio('layout-picker', 'layout', state.layout);
    setRadio('shape', 'shape', state.shape);
    setRadio('mode', 'mode', state.mode);

    const active = new Set([state.shape, state.mode, state.layout === 'serpentine' ? 'serpentine' : 'parallel']);
    if (state.material === 'custom') active.add('custom-material');
    for (const n of $$('[data-show]')) n.hidden = !n.dataset.show.split(' ').some((t) => active.has(t));

    $('#count-label').textContent = state.layout === 'serpentine' ? 'Passes' : 'Channels';
    $('#cw-label').textContent = state.shape === 'square' ? 'Side' : 'Width';
    const stdOpt = $('#flowMode option[value="std"]');
    stdOpt.disabled = !isGas();

    const mat = MATERIALS[state.material];
    $('#material-hint').textContent = state.material === 'custom' ? '' :
      `k = ${Units.format('conductivity', mat.k)} · ρ = ${Units.format('density', mat.rho)}`;

    const f = FLUIDS[state.fluid];
    let fh = '';
    try {
      const p = Physics.fluidProps(state.fluid, state.Tin, state.pIn);
      fh = `At inlet: ρ ${Units.format('density', p.rho)}, cp ${Units.format('cp', p.cp)}, μ ${Units.format('viscosity', p.mu)}`;
      if (f.phase === 'liquid') fh += ` · freezes at ${Units.format('temp', f.freeze)}`;
    } catch (e) { /* invalid input; leave hint empty */ }
    $('#fluid-hint').textContent = fh;

    let ph = '';
    if (state.layout === 'serpentine') {
      const n = Math.round(state.count);
      ph = n % 2 === 0 ? 'Even number of passes: inlet and outlet on the same edge.' : 'Odd number of passes: inlet and outlet on opposite edges.';
    } else if (state.layout === 'parallelZ') ph = 'Z-type: inlet and outlet at opposite corners (reverse return).';
    else ph = 'U-type: inlet and outlet on the same side.';
    $('#port-hint').textContent = ph;
  }

  // ---------- Events ----------

  function massFromState() {
    const pIn = Physics.fluidProps(state.fluid, state.Tin, state.pIn);
    if (state.flowMode === 'mass') return state.flow;
    if (state.flowMode === 'std') return state.flow * FLUIDS[state.fluid].M;
    return state.flow * pIn.rho;
  }
  function setFlowMode(mode) {
    const mdot = massFromState();
    const pIn = Physics.fluidProps(state.fluid, state.Tin, state.pIn);
    state.flowMode = mode;
    state.flow = mode === 'mass' ? mdot : mode === 'std' ? mdot / FLUIDS[state.fluid].M : mdot / pIn.rho;
  }

  function onInput(e) {
    const inp = e.target;
    const key = inp.dataset.key;
    if (!key) return;
    if (inp.type === 'checkbox') state[key] = inp.checked;
    else if (inp.tagName === 'SELECT') {
      if (key === 'flowMode') { setFlowMode(inp.value); renderInputs(); }
      else {
        state[key] = inp.value;
        if (key === 'fluid' && !isGas() && state.flowMode === 'std') { setFlowMode('vol'); }
        if (key === 'fluid' || key === 'material') renderInputs();
      }
    } else {
      const raw = inp.value.trim();
      const q = inp.dataset.q;
      if (key === 'headerDepth' && raw === '') { state.headerDepth = 0; inp.classList.remove('bad'); schedule(); return; }
      const d = parseFloat(raw);
      if (raw === '' || !isFinite(d)) { inp.classList.add('bad'); return; }
      inp.classList.remove('bad');
      if (q === 'int') state[key] = Math.max(1, Math.round(d));
      else if (q === 'flow') state[key] = Units.fromDisplay(flowQty(), d);
      else state[key] = Units.fromDisplay(q, d);
    }
    syncControls();
    schedule();
  }

  function bindEvents() {
    const form = $('#form');
    form.addEventListener('input', onInput);
    form.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onInput(e); });
    form.addEventListener('submit', (e) => e.preventDefault());

    const radio = (group, attr, fn) => $(`#${group}`).addEventListener('click', (e) => {
      const b = e.target.closest(`[data-${attr}]`);
      if (b) { fn(b.dataset[attr]); syncControls(); schedule(); }
    });
    radio('layout-picker', 'layout', (v) => { state.layout = v; });
    radio('shape', 'shape', (v) => { state.shape = v; renderInputs(); });
    radio('mode', 'mode', (v) => {
      // Carry the current result over so switching modes keeps the same operating point.
      if (lastResult && lastResult.ok) {
        if (v === 'load') state.Q = Math.round(lastResult.Q);
        else state.TsMax = +lastResult.TsMax.toFixed(1);
      }
      state.mode = v;
      renderInputs();
    });
    radio('units', 'units', (v) => { Units.setSystem(v); renderInputs(); });

    $('#preset').addEventListener('change', (e) => {
      const p = PRESETS[e.target.value];
      if (!p) return;
      state = Object.assign({ kCustom: state.kCustom, rhoCustom: state.rhoCustom }, clone(p.state));
      currentApp = p.name;
      renderInputs();
      schedule();
      e.target.value = '';
      toast(`Loaded preset: ${p.name}`);
    });

    $('#share').addEventListener('click', async () => {
      const url = location.href.split('#')[0] + '#d=' + encodeState();
      history.replaceState(null, '', url);
      try { await navigator.clipboard.writeText(url); toast('Link copied to clipboard'); }
      catch (err) { toast('Link updated in the address bar'); }
    });
    $('#print').addEventListener('click', () => {
      const notes = $('.notes');
      const wasOpen = notes.open;
      notes.open = true;
      window.print();
      notes.open = wasOpen;
    });
    window.addEventListener('resize', () => schedule());
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => schedule());
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- Persistence ----------

  function encodeState() {
    return btoa(unescape(encodeURIComponent(JSON.stringify({ s: state, u: Units.system }))));
  }
  function loadSaved() {
    let saved = null;
    const m = location.hash.match(/#d=([^&]+)/);
    if (m) { try { saved = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { saved = null; } }
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { saved = null; } }
    if (saved && saved.s && FLUIDS[saved.s.fluid] && MATERIALS[saved.s.material]) {
      state = Object.assign(state, saved.s);
      Units.setSystem(saved.u);
    }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ s: state, u: Units.system })); } catch (e) { /* storage unavailable */ }
  }

  // ---------- Results ----------

  let pending = false, lastResult = null;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; update(); }, 0);
  }

  const fmt = (q, v, o) => Units.format(q, v, o);
  function fmtPower(w) {
    if (!isFinite(w)) return '—';
    if (Math.abs(w) >= 10000) return Units.fmtNumber(w / 1000, 1) + ' kW';
    if (Math.abs(w) >= 1000) return Units.fmtNumber(w / 1000, 2) + ' kW';
    return Units.fmtNumber(w, 0) + ' W';
  }
  function powerAlt(w) { return Units.system === 'IMP' ? `${Units.fmtNumber(w * 3.412142, 0)} BTU/h` : ''; }

  function update() {
    let res;
    try { res = Physics.solve(state, { app: currentApp, fmt: (q, v) => Units.format(q, v) }); }
    catch (e) { res = { ok: false, issues: [{ level: 'error', msg: 'Calculation failed: ' + e.message }] }; }
    lastResult = res;
    save();
    renderHero(res);
    renderIssues(res.issues || []);
    if (res.geometry && !res.geometry.issues.some((i) => i.level === 'error')) {
      Drawing.drawTop($('#drawing'), state, res);
      Drawing.drawSection($('#section'), state, res);
    } else {
      $('#drawing').textContent = 'Fix the geometry errors above to see the layout.';
      $('#section').textContent = '';
    }
    renderTempLegend(res);
    renderMetrics(res);
    renderBars(res);
    renderCharts(res);
  }

  function renderHero(res) {
    const hero = $('#hero');
    const valid = res.ok && isFinite(res.Q);
    hero.classList.toggle('invalid', !valid);
    const side = $('#hero-side');
    side.textContent = '';
    const add = (k, v) => {
      const d = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      d.append(dt, dd); side.appendChild(d);
    };
    if (state.mode === 'capacity') {
      $('#hero-label').textContent = 'Max. heat dissipation';
      $('#hero-value').textContent = valid ? fmtPower(res.Q) : '—';
      $('#hero-sub').textContent = valid ? [powerAlt(res.Q), `surface ≤ ${fmt('temp', state.TsMax)} with ${fmt('temp', state.Tin)} ${FLUIDS[state.fluid].short} inlet`].filter(Boolean).join(' · ') : 'Check the inputs';
    } else {
      $('#hero-label').textContent = 'Peak surface temperature';
      $('#hero-value').textContent = valid ? fmt('temp', res.TsMax) : '—';
      $('#hero-sub').textContent = valid ? `at ${fmtPower(state.Q)}${powerAlt(state.Q) ? ' (' + powerAlt(state.Q) + ')' : ''} with ${fmt('temp', state.Tin)} ${FLUIDS[state.fluid].short} inlet` : 'Check the inputs';
    }
    if (valid) {
      add('Coolant outlet', fmt('temp', res.Tout));
      add('Pressure drop', fmt('dpressure', res.dp));
      add('Thermal resistance', fmt('rth', res.Rth, { digits: 4 }));
    }
  }

  function renderIssues(issues) {
    const box = $('#issues');
    box.textContent = '';
    const order = { error: 0, warn: 1, info: 2 };
    const sorted = issues.slice().sort((a, b) => order[a.level] - order[b.level]);
    box.hidden = !sorted.length;
    for (const i of sorted) {
      const d = document.createElement('div');
      d.className = 'issue ' + i.level;
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = { error: 'Error', warn: 'Warning', info: 'Note' }[i.level];
      const m = document.createElement('span');
      m.textContent = i.msg;
      d.append(t, m);
      box.appendChild(d);
    }
  }

  function renderTempLegend(res) {
    const lg = $('#temp-legend');
    lg.textContent = '';
    if (!res.ok) return;
    const a = document.createElement('span'); a.textContent = 'Coolant ' + fmt('temp', res.Tin);
    const r = document.createElement('span'); r.className = 'ramp';
    const b = document.createElement('span'); b.textContent = fmt('temp', res.Tout);
    lg.append(a, r, b);
  }

  function renderMetrics(res) {
    const box = $('#metrics');
    box.textContent = '';
    if (!res.ok) { box.textContent = 'No results — resolve the errors above.'; return; }
    const g = res.geometry;
    const gas = res.props.phase === 'gas';
    const items = [
      ['Coolant temperature rise', fmt('dtemp', res.Tout - res.Tin)],
      ['Mass flow', fmt('massflow', res.mdot)],
      ['Volume flow (mean)', fmt('volflow', res.volFlow)],
      ['Channel velocity', fmt('velocity', res.v), `port ${fmt('velocity', res.vPort)}`],
      ['Reynolds number', Units.fmtNumber(res.Re, 0), res.regime],
      ['Prandtl number', Units.fmtNumber(res.Pr, 2)],
      ['Heat transfer coeff.', fmt('htc', res.h, { digits: Units.system === 'SI' ? 0 : 1 }), `Nu ${Units.fmtNumber(res.Nu, 1)}`],
      ['Hydraulic diameter', fmt('length', g.Dh)],
      ['Channel length', fmt('length', g.Lch), `${g.nPar} × in parallel`],
      ['Effective wetted area', fmt('area', res.Aeff), `fin efficiency ${(100 * res.eta).toFixed(0)} %`],
      ['NTU / effectiveness', `${Units.fmtNumber(res.NTU, 2)} / ${(100 * res.eps).toFixed(0)} %`],
      ['Average heat flux', fmt('flux', res.flux, { digits: 2 })],
      ['Surface non-uniformity (est.)', fmt('dtemp', res.spread)],
      ['Hydraulic pump power', Units.system === 'SI' ? fmt('power', res.pumpPower, { digits: 2 }) : fmt('power2', res.pumpPower, { digits: 4 })],
      ['Plate mass (dry)', fmt('mass', res.plateMass)],
      ['Coolant volume', fmt('volume', res.fluidVol)],
      gas ? ['Mach number', Units.fmtNumber(res.Mach, 3)] : ['Boiling point at inlet p', fmt('temp', res.Tboil)],
    ];
    const lo = state.mode === 'capacity';
    const b = res.bounds;
    if (lo) items.push(['Q range (uniform flux … isothermal)', `${fmtPower((state.TsMax - state.Tin) / b.uniformFlux)} … ${fmtPower((state.TsMax - state.Tin) / b.isothermal)}`]);
    else items.push(['Peak T range (isothermal … uniform flux)', `${fmt('temp', state.Tin + state.Q * b.isothermal, { noUnit: true })} … ${fmt('temp', state.Tin + state.Q * b.uniformFlux)}`]);
    for (const [k, v, s] of items) {
      const d = document.createElement('div'); d.className = 'metric';
      const a = document.createElement('div'); a.className = 'k'; a.textContent = k;
      const c = document.createElement('div'); c.className = 'v'; c.textContent = v;
      d.append(a, c);
      if (s) { const e = document.createElement('div'); e.className = 's'; e.textContent = s; d.appendChild(e); }
      box.appendChild(d);
    }
  }

  function stackBar(container, parts, fmtVal) {
    container.textContent = '';
    const total = parts.reduce((a, p) => a + Math.max(0, p.v), 0);
    if (!(total > 0)) return;
    const bar = document.createElement('div'); bar.className = 'stack';
    const leg = document.createElement('div'); leg.className = 'stack-legend';
    // Colour follows the entity (its slot in the full list), so hiding empty parts never repaints others.
    parts.forEach((p, i) => { p.slot = i + 1; });
    parts.filter((p) => p.v > 0).forEach((p) => {
      const share = Math.max(0, p.v) / total;
      const color = `var(--s${p.slot})`;
      if (share > 0) {
        const seg = document.createElement('div');
        seg.style.flex = String(share);
        seg.style.background = color;
        seg.title = `${p.label}: ${fmtVal(p.v)} (${(100 * share).toFixed(0)} %)`;
        bar.appendChild(seg);
      }
      const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = color;
      const lb = document.createElement('span'); lb.textContent = p.label;
      const vl = document.createElement('span'); vl.className = 'val'; vl.textContent = fmtVal(p.v);
      const pc = document.createElement('span'); pc.className = 'pct'; pc.textContent = (100 * share).toFixed(0) + ' %';
      leg.append(sw, lb, vl, pc);
    });
    container.append(bar, leg);
  }

  function renderBars(res) {
    if (!res.ok) { $('#rth-bar').textContent = ''; $('#dp-bar').textContent = ''; return; }
    const r = res.resistances;
    stackBar($('#rth-bar'), [
      { label: 'Coolant heating (flow capacity)', v: r.capacity },
      { label: 'Convection to coolant', v: r.convection },
      { label: 'Conduction through wall', v: r.wall },
      { label: 'Lateral spreading', v: r.spreading },
    ], (v) => fmt('rth', v, { digits: 4 }));
    const p = res.dpParts;
    const parts = [
      { label: 'Channel friction', v: p.friction },
      { label: '180° bends', v: p.bends },
      { label: 'Channel entry/exit', v: p.entryExit },
      { label: 'Headers', v: p.headers },
      { label: 'Ports', v: p.ports },
    ];
    stackBar($('#dp-bar'), parts, (v) => fmt('dpressure', v, { digits: 2 }));
  }

  function renderCharts(res) {
    if (!res.ok) { $('#chart1').textContent = ''; $('#chart2').textContent = ''; return; }
    const pts = Physics.sweep(state).filter((p) => p.res.ok);
    const q = flowQty();
    const fx = (si) => Units.toDisplay(q, si);
    const xTitle = `Flow (${Units.label(q)})`;
    const fmtX = (v) => Units.fmtNumber(v);
    const fmtXFull = (v) => `${Units.fmtNumber(v)} ${Units.label(q)}`;
    if (state.mode === 'capacity') {
      $('#chart1-title').textContent = 'Heat dissipation vs. flow';
      Charts.lineChart($('#chart1'), {
        data: pts.map((p) => ({ x: fx(p.flow), y: p.res.Q })),
        op: { x: fx(state.flow), y: res.Q }, opLabel: fmtPower(res.Q),
        xTitle, yTitle: 'Heat (W)', fmtX, fmtXFull,
        fmtY: (v) => (v >= 1000 ? Units.fmtNumber(v / 1000) + 'k' : Units.fmtNumber(v)), fmtYFull: fmtPower,
      });
    } else {
      $('#chart1-title').textContent = 'Peak surface temperature vs. flow';
      Charts.lineChart($('#chart1'), {
        data: pts.map((p) => ({ x: fx(p.flow), y: Units.toDisplay('temp', p.res.TsMax) })),
        op: { x: fx(state.flow), y: Units.toDisplay('temp', res.TsMax) }, opLabel: fmt('temp', res.TsMax),
        xTitle, yTitle: `Peak surface (${Units.label('temp')})`, fmtX, fmtXFull,
        fmtY: (v) => Units.fmtNumber(v, 0), fmtYFull: (v) => `${Units.fmtNumber(v, 1)} ${Units.label('temp')}`,
      });
    }
    Charts.lineChart($('#chart2'), {
      data: pts.map((p) => ({ x: fx(p.flow), y: Units.toDisplay('dpressure', p.res.dp) })),
      op: { x: fx(state.flow), y: Units.toDisplay('dpressure', res.dp) }, opLabel: fmt('dpressure', res.dp),
      xTitle, yTitle: `Pressure drop (${Units.label('dpressure')})`, fmtX, fmtXFull,
      fmtY: (v) => Units.fmtNumber(v), fmtYFull: (v) => `${Units.fmtNumber(v)} ${Units.label('dpressure')}`,
    });
  }

  // ---------- Init ----------
  populateSelects();
  loadSaved();
  bindEvents();
  renderInputs();
  update();
})();
