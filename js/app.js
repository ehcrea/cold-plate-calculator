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
    renderSources();
    syncControls();
  }

  // ---------- Heat sources editor ----------

  const SRC_FIELDS = [
    // [key, label, quantity, row]
    ['P', 'Power', 'power', 0], ['Tlimit', 'Temp. limit', 'temp', 0], ['rjc', 'R<sub>jc</sub>', 'rth', 0],
    ['x', 'Centre x', 'length', 1], ['y', 'Centre y', 'length', 1], ['w', 'Length', 'length', 1], ['h', 'Width', 'length', 1],
    ['tim', 'TIM thickness', 'length', 2], ['kTim', 'TIM conductivity', 'conductivity', 2],
  ];

  function newSource() {
    const n = state.sources.length + 1;
    return { name: `Source ${n}`, P: 200, x: state.L / 2, y: state.W / 2, w: Math.min(0.05, state.L / 3), h: Math.min(0.05, state.W / 3),
      tim: 0.0001, kTim: 3, rjc: 0, Tlimit: 125 };
  }

  function renderSources() {
    const list = $('#sources-list');
    list.textContent = '';
    state.sources.forEach((src, i) => {
      const card = document.createElement('div');
      card.className = 'src';
      card.dataset.i = i;
      const head = document.createElement('div');
      head.className = 'src-head';
      const name = document.createElement('input');
      name.type = 'text'; name.value = src.name; name.dataset.src = 'name'; name.setAttribute('aria-label', 'Source name');
      const dup = document.createElement('button');
      dup.type = 'button'; dup.className = 'icon-btn'; dup.dataset.act = 'dup'; dup.title = 'Duplicate'; dup.textContent = '⧉';
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'icon-btn'; del.dataset.act = 'del'; del.title = 'Remove'; del.textContent = '✕';
      head.append(name, dup, del);
      card.appendChild(head);
      const rows = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
      rows[0].className = 'grid3'; rows[1].className = 'grid4'; rows[2].className = 'grid2';
      for (const [key, label, q, row] of SRC_FIELDS) {
        const lab = document.createElement('label');
        const t = document.createElement('span');
        t.innerHTML = label; // static labels defined above
        const u = document.createElement('span');
        u.className = 'u'; u.textContent = `(${Units.label(q)})`;
        const inp = document.createElement('input');
        inp.type = 'number'; inp.step = 'any'; inp.dataset.src = key; inp.dataset.q = q;
        inp.value = displayNumber(Units.toDisplay(q, src[key]));
        lab.append(t, u, inp);
        rows[row].appendChild(lab);
      }
      card.append(...rows);
      list.appendChild(card);
    });
    updateSourcesTotal();
  }

  function updateSourcesTotal() {
    const tot = state.sources.reduce((a, x) => a + (x.P || 0), 0);
    $('#sources-total').textContent = state.sources.length ? `${state.sources.length} source${state.sources.length > 1 ? 's' : ''}, total ${fmtPower(tot)}` : 'No heat sources yet.';
  }

  function onSourceInput(inp) {
    const i = +inp.closest('.src').dataset.i;
    const key = inp.dataset.src;
    if (key === 'name') { state.sources[i].name = inp.value; schedule(); return; }
    const d = parseFloat(inp.value);
    const nonNeg = key !== 'x' && key !== 'y' && key !== 'Tlimit';
    if (!isFinite(d) || (nonNeg && d < 0) || ((key === 'w' || key === 'h') && d <= 0)) { inp.classList.add('bad'); return; }
    inp.classList.remove('bad');
    state.sources[i][key] = Units.fromDisplay(inp.dataset.q, d);
    updateSourcesTotal();
    schedule();
  }

  function bindSourceEvents() {
    $('#add-source').addEventListener('click', () => { state.sources.push(newSource()); renderSources(); schedule(); });
    $('#sources-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const i = +b.closest('.src').dataset.i;
      if (b.dataset.act === 'del') state.sources.splice(i, 1);
      else {
        const c = clone(state.sources[i]);
        c.name += ' copy';
        c.x = Math.min(state.L - c.w / 2, c.x + c.w * 1.1);
        state.sources.splice(i + 1, 0, c);
      }
      renderSources();
      schedule();
    });

    // Drag sources on the plate layout.
    const box = $('#drawing');
    let drag = null;
    box.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.draggable');
      if (!g || !lastView) return;
      const svg = box.querySelector('svg');
      const r = svg.getBoundingClientRect();
      const scale = svg.viewBox.baseVal.width / r.width;
      drag = { i: +g.dataset.i, g, svg, scale, x0: e.clientX, y0: e.clientY };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const src = state.sources[drag.i];
      const k = lastView.k * 1e3;
      let dx = (e.clientX - drag.x0) * drag.scale / k, dy = (e.clientY - drag.y0) * drag.scale / k;
      dx = Math.min(state.L - src.w / 2, Math.max(src.w / 2, src.x + dx)) - src.x;
      dy = Math.min(state.W - src.h / 2, Math.max(src.h / 2, src.y + dy)) - src.y;
      drag.dx = dx; drag.dy = dy;
      drag.g.setAttribute('transform', `translate(${dx * k} ${dy * k})`);
    });
    const end = () => {
      if (!drag) return;
      const src = state.sources[drag.i];
      if (drag.dx !== undefined) { src.x += drag.dx; src.y += drag.dy; }
      drag = null;
      renderSources();
      schedule();
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
  }

  /** Segmented controls, conditional fields and context hints. */
  function syncControls() {
    const setRadio = (group, attr, value) => $$(`#${group} [data-${attr}]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === value)));
    setRadio('units', 'units', Units.system);
    setRadio('layout-picker', 'layout', state.layout);
    setRadio('shape', 'shape', state.shape);
    setRadio('mode', 'mode', state.mode);

    const active = new Set([state.shape, state.mode, state.layout === 'serpentine' ? 'serpentine' : 'parallel',
      state.heatArea === 'sources' ? 'sources' : 'uniform']);
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
    if (inp.dataset.src) { onSourceInput(inp); return; }
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
      const th = thermal();
      if (th) {
        if (v === 'load') state.Q = Math.round(th.Q);
        else state.TsMax = +th.Tpeak.toFixed(1);
      }
      state.mode = v;
      renderInputs();
    });
    radio('units', 'units', (v) => { Units.setSystem(v); renderInputs(); });

    $('#preset').addEventListener('change', (e) => {
      const p = PRESETS[e.target.value];
      if (!p) return;
      state = Object.assign({ kCustom: state.kCustom, rhoCustom: state.rhoCustom, sources: [] }, clone(p.state));
      currentApp = p.name;
      renderInputs();
      schedule();
      e.target.value = '';
      toast(`Loaded preset: ${p.name}`);
    });

    $('#share').addEventListener('click', async () => {
      const url = shareUrl();
      history.replaceState(null, '', url);
      try { await navigator.clipboard.writeText(url); toast('Link copied to clipboard'); }
      catch (err) { toast('Link updated in the address bar'); }
    });
    $('#export-pdf').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'Preparing…';
      try { await Report.exportPdf(); toast('PDF report downloaded'); }
      catch (err) { console.error(err); toast('PDF export failed — use Print → Save as PDF instead'); }
      finally { btn.disabled = false; btn.textContent = label; }
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
  function shareUrl() { return location.href.split('#')[0] + '#d=' + encodeState(); }

  function loadSaved() {
    let saved = null;
    const m = location.hash.match(/#d=([^&]+)/);
    if (m) { try { saved = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { saved = null; } }
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { saved = null; } }
    if (saved && saved.s && FLUIDS[saved.s.fluid] && MATERIALS[saved.s.material]) {
      state = Object.assign(state, saved.s);
      Units.setSystem(saved.u);
    }
    if (!Array.isArray(state.sources)) state.sources = [];
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ s: state, u: Units.system })); } catch (e) { /* storage unavailable */ }
  }

  // ---------- Results ----------

  let pending = false, lastResult = null, lastMap = null, lastView = null;
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

  const solveOpts = () => ({ app: currentApp, fmt: (q, v) => Units.format(q, v) });

  function update() {
    let res, map = null;
    try {
      const ev = Physics2D.evaluate(state, solveOpts());
      res = ev.base; map = ev.map;
    } catch (e) {
      console.error(e);
      res = { ok: false, issues: [{ level: 'error', msg: 'Calculation failed: ' + e.message }] };
    }
    if (state.heatArea === 'sources' && !state.sources.length && res.ok) map = null;
    lastResult = res;
    lastMap = map;
    save();
    const issues = (res.issues || []).concat(mapIssues(res, map));
    renderHero(res);
    renderIssues(issues);
    if (res.geometry && !res.geometry.issues.some((i) => i.level === 'error')) {
      lastView = Drawing.drawTop($('#drawing'), state, res);
      Drawing.drawSection($('#section'), state, res);
    } else {
      lastView = null;
      $('#drawing').textContent = 'Fix the geometry errors above to see the layout.';
      $('#section').textContent = '';
    }
    renderTempLegend(res);
    renderMap(res, map);
    renderSourcesTable(map);
    renderMetrics(res);
    renderBars(res);
    renderCharts(res);
  }

  /** Headline thermal numbers: from the 2D map when available, otherwise the 1D model. */
  function thermal() {
    const res = lastResult, map = lastMap;
    if (!res || !res.ok) return null;
    if (!map) return state.heatArea === 'sources' ? null : { Q: res.Q, Tpeak: res.TsMax, Tout: res.Tout, Rth: res.Rth, Tmin: res.Tin, src: false };
    const Q = map.Qtotal;
    return { Q, Tpeak: map.Tmax, Tout: map.Tout, Tmin: map.Tmin, Rth: Q > 0 ? (map.Tmax - state.Tin) / Q : NaN, src: state.heatArea === 'sources' };
  }

  function mapIssues(res, map) {
    const out = [];
    if (!res.ok) return out;
    if (state.heatArea === 'sources' && !state.sources.length) {
      out.push({ level: 'info', msg: 'Add at least one heat source, or switch "Heat applied as" to a uniform option.' });
      return out;
    }
    if (!map) return out;
    for (const r of map.sources) {
      if (r.onPlate < 0.999) out.push({ level: 'warn', msg: `${r.name} extends beyond the plate edge — only ${(100 * r.onPlate).toFixed(0)} % of its footprint is on the plate.` });
      if (r.margin < 0) out.push({ level: 'error', msg: `${r.name} exceeds its temperature limit: ${fmt('temp', r.Tj)} vs. ${fmt('temp', r.limit)}.` });
    }
    if (state.heatArea !== 'sources') {
      const d = state.mode === 'capacity' ? map.Qtotal / res.Q - 1 : (map.Tmax - state.Tin) / (res.TsMax - state.Tin) - 1;
      if (Math.abs(d) > 0.2) out.push({ level: 'info', msg: `The 2D map differs from the quick 1D estimate by ${(100 * Math.abs(d)).toFixed(0)} % — it resolves hot spots at plate edges and between channels that the 1D model averages out.` });
    }
    const spread = map.Tmax - map.Tmin;
    const batteryLike = state.heatArea === 'sources' ? map.sources.every((r) => r.limit <= 60) : state.mode === 'capacity' ? state.TsMax <= 50 : map.Tmax <= 50;
    if (spread > 5 && batteryLike) out.push({ level: 'info', msg: `Plate surface temperature varies by ${fmt('dtemp', spread)} (battery modules typically target < ${fmt('dtemp', 5)}).` });
    return out;
  }

  function renderHero(res) {
    const hero = $('#hero');
    const th = thermal();
    const valid = !!th && isFinite(th.Q);
    hero.classList.toggle('invalid', !valid);
    const side = $('#hero-side');
    side.textContent = '';
    const add = (k, v) => {
      const d = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      d.append(dt, dd); side.appendChild(d);
    };
    const inlet = `${fmt('temp', state.Tin)} ${FLUIDS[state.fluid].short} inlet`;
    if (th && th.src) {
      const hot = lastMap.sources.reduce((a, r) => (r.Tj > a.Tj ? r : a));
      $('#hero-label').textContent = `Hottest component · ${hot.name}`;
      $('#hero-value').textContent = fmt('temp', hot.Tj);
      const head = lastMap.headroom;
      $('#hero-sub').textContent = `${fmtPower(th.Q)} total with ${inlet} · ` + (head >= 1
        ? `power can rise ×${head.toFixed(2)} (to ${fmtPower(th.Q * head)}) before the first limit`
        : `over limit: reduce power to ×${Math.max(0, head).toFixed(2)} (${fmtPower(th.Q * Math.max(0, head))})`);
    } else if (state.mode === 'capacity') {
      $('#hero-label').textContent = 'Max. heat dissipation';
      $('#hero-value').textContent = valid ? fmtPower(th.Q) : '—';
      $('#hero-sub').textContent = valid ? [powerAlt(th.Q), `peak surface ≤ ${fmt('temp', state.TsMax)} with ${inlet}`].filter(Boolean).join(' · ') : 'Check the inputs';
    } else {
      $('#hero-label').textContent = 'Peak surface temperature';
      $('#hero-value').textContent = valid ? fmt('temp', th.Tpeak) : '—';
      $('#hero-sub').textContent = valid ? `at ${fmtPower(state.Q)}${powerAlt(state.Q) ? ' (' + powerAlt(state.Q) + ')' : ''} with ${inlet}` : 'Check the inputs';
    }
    if (valid) {
      if (th.src) add('Peak plate surface', fmt('temp', th.Tpeak));
      add('Coolant outlet', fmt('temp', th.Tout));
      add('Pressure drop', fmt('dpressure', res.dp));
      if (!th.src) add('Thermal resistance', fmt('rth', th.Rth, { digits: 4 }));
    }
  }

  function renderMap(res, map) {
    const box = $('#map');
    const lg = $('#map-legend');
    if (!map) { box.textContent = state.heatArea === 'sources' && res.ok ? 'Add a heat source to see the temperature map.' : 'No map — resolve the errors above.'; lg.textContent = ''; return; }
    const view = Drawing.drawMap(box, state, res, map);
    Drawing.mapLegend(lg, map);
    // Hover readout.
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    box.appendChild(tip);
    const svg = view.svg;
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const sc = svg.viewBox.baseVal.width / r.width;
      const x = ((e.clientX - r.left) * sc - view.padL) / (view.k * 1e3);
      const y = ((e.clientY - r.top) * sc - view.padT) / (view.k * 1e3);
      const { nx, ny, dx, dy } = map.grid;
      const i = Math.floor(x / dx), j = Math.floor(y / dy);
      if (i < 0 || j < 0 || i >= nx || j >= ny) { tip.hidden = true; return; }
      tip.textContent = '';
      const b = document.createElement('b'); b.textContent = fmt('temp', map.T[j * nx + i]);
      const m = document.createElement('div'); m.className = 'muted'; m.textContent = `x ${fmt('length', x)}, y ${fmt('length', y)}`;
      tip.append(b, m);
      tip.hidden = false;
      let left = e.clientX - r.left + 14;
      if (left + tip.offsetWidth > r.width) left = e.clientX - r.left - tip.offsetWidth - 14;
      tip.style.left = left + 'px';
      tip.style.top = Math.max(0, e.clientY - r.top - tip.offsetHeight - 10) + 'px';
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  /** Rows for the component table: shared with the PDF report. */
  function sourceRows(map) {
    return map.sources.map((r) => ({
      name: r.name, P: fmtPower(r.P),
      plate: `${fmt('temp', r.Tplate, { noUnit: true })} / ${fmt('temp', r.TplateMax)}`,
      tcase: fmt('temp', r.Tcase), tj: fmt('temp', r.Tj), limit: fmt('temp', r.limit),
      margin: fmt('dtemp', r.margin), ok: r.margin >= 0,
    }));
  }

  function renderSourcesTable(map) {
    const card = $('#sources-card');
    const show = state.heatArea === 'sources' && map && map.sources.length;
    card.hidden = !show;
    if (!show) return;
    const t = document.createElement('table');
    t.className = 'data';
    const head = ['Component', 'Power', 'Plate avg / max', 'Case', 'Junction', 'Limit', 'Margin', 'Status'];
    const thead = t.createTHead().insertRow();
    head.forEach((h) => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
    const tb = t.createTBody();
    for (const r of sourceRows(map)) {
      const tr = tb.insertRow();
      [r.name, r.P, r.plate, r.tcase, r.tj, r.limit, r.margin].forEach((v, i) => {
        const td = tr.insertCell(); td.textContent = v;
        if (i === 4) td.className = 'strong';
      });
      const st = tr.insertCell();
      const sp = document.createElement('span');
      sp.className = 'status ' + (r.ok ? 'ok' : 'over');
      sp.textContent = r.ok ? '✓ OK' : '⚠ Over limit';
      st.appendChild(sp);
    }
    const wrap = $('#sources-table');
    wrap.textContent = '';
    wrap.appendChild(t);
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
    const th = thermal();
    const a = document.createElement('span'); a.textContent = 'Coolant ' + fmt('temp', res.Tin);
    const r = document.createElement('span'); r.className = 'ramp';
    const b = document.createElement('span'); b.textContent = fmt('temp', th ? th.Tout : res.Tout);
    lg.append(a, r, b);
  }

  /** Result rows [label, value, sub-label] shared by the results grid and the PDF report. */
  function metricItems(res) {
    const g = res.geometry;
    const gas = res.props.phase === 'gas';
    const th = thermal();
    const map = lastMap;
    const items = [
      ['Coolant temperature rise', th ? fmt('dtemp', th.Tout - res.Tin) : '—'],
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
      map && map.sources.length
        ? ['Max. component heat flux', fmt('flux', Math.max(...state.sources.map((x) => x.P / (x.w * x.h))), { digits: 2 })]
        : ['Average heat flux', th ? fmt('flux', th.Q / g.heatArea, { digits: 2 }) : '—'],
      ['Plate temperature spread', map ? fmt('dtemp', map.Tmax - map.Tmin) : '—', map ? '2D map, max − min' : ''],
      ['Hydraulic pump power', Units.system === 'SI' ? fmt('power', res.pumpPower, { digits: 2 }) : fmt('power2', res.pumpPower, { digits: 4 })],
      ['Plate mass (dry)', fmt('mass', res.plateMass)],
      ['Coolant volume', fmt('volume', res.fluidVol)],
      gas ? ['Mach number', Units.fmtNumber(res.Mach, 3)] : ['Boiling point at inlet p', fmt('temp', res.Tboil)],
    ];
    if (state.heatArea === 'sources') items.push(['1D check (same power, uniform)', `peak ${fmt('temp', res.TsMax)}`]);
    else if (state.mode === 'capacity') items.push(['1D quick estimate', fmtPower(res.Q), 'uniform-heat model']);
    else items.push(['1D quick estimate', `peak ${fmt('temp', res.TsMax)}`, 'uniform-heat model']);
    if (map) items.push(['2D grid', `${map.grid.nx} × ${map.grid.ny} cells`, `${fmt('length', map.grid.dx)} cell size`]);
    return items;
  }

  function renderMetrics(res) {
    const box = $('#metrics');
    box.textContent = '';
    if (!res.ok) { box.textContent = 'No results — resolve the errors above.'; return; }
    for (const [k, v, s] of metricItems(res)) {
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

  let sweepToken = 0;
  function renderCharts(res) {
    const token = ++sweepToken;
    if (!res.ok) { $('#chart1').textContent = ''; $('#chart2').textContent = ''; return; }
    const pts = Physics.sweep(state).filter((p) => p.res.ok);
    const q = flowQty();
    const fx = (si) => Units.toDisplay(q, si);
    const xTitle = `Flow (${Units.label(q)})`;
    const fmtX = (v) => Units.fmtNumber(v);
    const fmtXFull = (v) => `${Units.fmtNumber(v)} ${Units.label(q)}`;
    const th = thermal();

    // Thermal curve from the 2D model on a coarser grid, computed in small steps to keep the page responsive.
    const kind = state.heatArea === 'sources' ? 'tj' : state.mode === 'capacity' ? 'q' : 'tmax';
    const titles = { tj: 'Hottest component vs. flow', q: 'Heat dissipation vs. flow', tmax: 'Peak surface temperature vs. flow' };
    $('#chart1-title').textContent = titles[kind];
    if (!th || (kind === 'tj' && !lastMap)) { $('#chart1').textContent = ''; }
    else {
      $('#chart1').textContent = 'Calculating…';
      const metric = (map) => (kind === 'q' ? map.Qtotal : kind === 'tmax' ? map.Tmax : Math.max(...map.sources.map((r) => r.Tj)));
      const opY = kind === 'q' ? th.Q : kind === 'tmax' ? th.Tpeak : Math.max(...lastMap.sources.map((r) => r.Tj));
      const ks = [0.25, 0.4, 0.6, 0.8, 1, 1.3, 1.7, 2.2, 3];
      const curve = [];
      let i = 0;
      const step = () => {
        if (token !== sweepToken) return;
        const t0 = performance.now();
        while (i < ks.length && performance.now() - t0 < 30) {
          const ev = Physics2D.evaluate(Object.assign({}, state, { flow: state.flow * ks[i] }), { maxCells: isGas() ? 1200 : 2500 });
          if (ev.map) curve.push({ k: ks[i], y: metric(ev.map) });
          i++;
        }
        if (i < ks.length) { setTimeout(step, 0); return; }
        // Pin the coarse-grid curve to the fine-grid operating point.
        const ref = curve.find((c) => c.k === 1);
        const isT = kind !== 'q';
        const corr = ref ? (isT ? (opY - state.Tin) / (ref.y - state.Tin) : opY / ref.y) : 1;
        const data = curve.map((c) => ({ x: fx(state.flow * c.k), y: isT ? state.Tin + (c.y - state.Tin) * corr : c.y * corr }));
        if (isT) {
          Charts.lineChart($('#chart1'), {
            data: data.map((d) => ({ x: d.x, y: Units.toDisplay('temp', d.y) })),
            op: { x: fx(state.flow), y: Units.toDisplay('temp', opY) }, opLabel: fmt('temp', opY),
            xTitle, yTitle: `${kind === 'tj' ? 'Hottest junction' : 'Peak surface'} (${Units.label('temp')})`, fmtX, fmtXFull,
            fmtY: (v) => Units.fmtNumber(v, 0), fmtYFull: (v) => `${Units.fmtNumber(v, 1)} ${Units.label('temp')}`,
          });
        } else {
          Charts.lineChart($('#chart1'), {
            data, op: { x: fx(state.flow), y: opY }, opLabel: fmtPower(opY),
            xTitle, yTitle: 'Heat (W)', fmtX, fmtXFull,
            fmtY: (v) => (v >= 1000 ? Units.fmtNumber(v / 1000) + 'k' : Units.fmtNumber(v)), fmtYFull: fmtPower,
          });
        }
      };
      setTimeout(step, 20);
    }
    Charts.lineChart($('#chart2'), {
      data: pts.map((p) => ({ x: fx(p.flow), y: Units.toDisplay('dpressure', p.res.dp) })),
      op: { x: fx(state.flow), y: Units.toDisplay('dpressure', res.dp) }, opLabel: fmt('dpressure', res.dp),
      xTitle, yTitle: `Pressure drop (${Units.label('dpressure')})`, fmtX, fmtXFull,
      fmtY: (v) => Units.fmtNumber(v), fmtYFull: (v) => `${Units.fmtNumber(v)} ${Units.label('dpressure')}`,
    });
  }

  // Read-only hooks for the PDF report.
  window.App = {
    state: () => state,
    result: () => lastResult,
    map: () => lastMap,
    thermal, sourceRows,
    appName: () => currentApp,
    metricItems, fmtPower, shareUrl, toast,
    rerender: update,
  };

  // ---------- Init ----------
  populateSelects();
  loadSaved();
  bindEvents();
  bindSourceEvents();
  renderInputs();
  update();
})();
