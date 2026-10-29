# Cold Plate Calculator

**Live:** https://ehcrea.github.io/cold-plate-calculator/

A browser-based tool for sizing liquid- and gas-cooled cold plates for **power electronics**, **battery modules** and **fuel-cell systems**. Enter the plate, channel layout and coolant, and it estimates:

- **Component temperatures**: place IGBT modules, diodes, battery modules or any heat source on the plate (drag them on the layout). For each one you get plate, case and junction temperature, margin to its limit, and how far total power can rise before the first limit is reached
- A **2D plate temperature map** with hover readout and the hottest point marked
- **Max. heat dissipation** at a given surface temperature limit, or **peak surface temperature** at a given heat load (uniform heating)
- **Pump curve matching**: pick or enter a pump or blower curve and the rest-of-loop pressure drop. The calculator finds the operating point where pump pressure equals plate plus loop pressure drop, and plots the pump curve against the system curve
- Coolant outlet temperature, pressure drop and its breakdown, and hydraulic pump power
- Thermal resistance breakdown (coolant capacity, convection, wall conduction, lateral spreading)
- Reynolds number, flow regime, heat-transfer coefficient, fin efficiency and NTU
- Heat and pressure-drop curves against flow rate
- Design warnings: erosion velocity, freezing and boiling margins, manifold maldistribution, Mach number and gas compressibility, material compatibility

Switches between **SI and Imperial** units. **Export PDF** downloads a design report (inputs, results, plate drawing, breakdowns, performance curves, design checks), and every design can be shared as a link.

> **v2 is an engineering estimate:** a 2D plate conduction model coupled to 1D channel hydraulics, meant for concept sizing (roughly ±15–30 %). Validate final designs with CFD or testing.

## Inputs

| Group | Options |
|---|---|
| Plate | Length × width × thickness. Al 6061 / 6063 / 3003 / 1100, Cu C110 / C101, SS 304 / 316L, Ti Gr 2, or a custom material |
| Layout | Serpentine (1–6 parallel circuits), parallel Z-type, parallel U-type. Channels can run along the length or the width; edge margin, header size, port diameter and mirrored ports are adjustable |
| Channel | Round, square or rectangular section; wall thickness to the heated face; wall roughness |
| Coolant | Water (DI), ethylene glycol 30/50 %, propylene glycol 30/50 %, clean dry air, N₂, H₂. Inlet temperature and pressure. Flow as volume, mass or standard flow (SLPM/SCFM), or from a pump curve (generic pump and blower presets, or your own points) plus a rest-of-loop pressure drop that scales with flow² |
| Heat input | Discrete heat sources (power, position, footprint, TIM thickness and conductivity, R<sub>jc</sub>, temperature limit), or uniform heat over the whole face or the channel area, with find max. heat or find surface temperature |

Application presets: inverter/IGBT plate, EV battery cold plate, fuel-cell cooling plate, hydrogen gas-cooled plate, high-flux copper plate.

## Run it

It's a static site with no build step and no dependencies. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8765
```

Then go to http://localhost:8765. It can also be hosted on GitHub Pages as is.

## Tests

```bash
node tests/physics.test.js
```

The tests check the correlations against textbook values, verify fluid properties, close the energy balance for every preset, and cover the unit conversions.

## Method

| Item | Model |
|---|---|
| Laminar heat transfer | Shah & London fully developed Nu<sub>H1</sub> vs. aspect ratio, plus a Hausen-type thermal-entry term per straight pass |
| Turbulent heat transfer | Gnielinski with a short-duct correction (1 + (D<sub>h</sub>/L)<sup>2/3</sup>) |
| Laminar friction | Shah apparent friction factor (developing flow), f·Re from Shah & London |
| Turbulent friction | Haaland (with roughness) |
| Transition | Linear blend between Re 2300 and Re 4000 |
| Bends | Darby 3-K for 180° returns |
| Pump operating point | Bisection on volume flow until pump Δp(Q) = plate Δp(Q) + loop Δp·(Q/Q<sub>ref</sub>)². The pump curve is linear between points |
| Other losses | Channel entry/exit K = 0.5 + 1.0; headers K = 1.0 each; ports K = 1.5 each |
| 2D plate model | Finite-difference grid over the plate face (up to about 6,000 cells, solved with preconditioned conjugate gradient). In-plane conduction uses the local solid thickness. Cells above channels, port leads and headers are coupled to the coolant through the heated-face wall and the fin-corrected convective film. The coolant is marched along each channel path, and plate and coolant are solved alternately to convergence |
| Components | Case = average plate temperature under the footprint + P·t<sub>TIM</sub>/(k<sub>TIM</sub>·A). Junction = case + P·R<sub>jc</sub>. Headroom = the power scale factor at which the first component reaches its limit |
| Plate conduction (1D) | Heated-face wall conduction, channel side walls as fins, lateral spreading between channels and at the edges |
| Plate temperature | Blends between the uniform-heat-flux limit (conservative) and the isothermal-plate ε-NTU limit (ideal), based on the plate's lateral conductance vs. the coolant heat capacity rate |
| Fluid properties | Temperature-dependent tables for liquids. Ideal gas with Sutherland viscosity for gases. Evaluated at the mean bulk temperature |

The 1D model supplies the pressure drop, heat-transfer coefficient and resistance breakdown, plus a quick cross-check. The 2D model supplies the headline temperatures, the map and the component results.

**Not modelled:** spreading through the plate thickness under very small sources, contact resistance beyond the TIM layer, flow maldistribution (warning only), two-phase flow, turbulators and pin fins, gas compressibility within the plate.

## Project layout

```
index.html          page structure
css/style.css       styles (light/dark, responsive, print)
js/units.js         SI ↔ Imperial conversion
js/data.js          fluids, materials, presets
js/physics.js       1D thermal / hydraulic solver (also runs in Node)
js/physics2d.js     2D plate temperature model with heat sources (also runs in Node)
js/drawing.js       plate top view and cross-section (SVG)
js/charts.js        performance curves (SVG)
js/report.js        PDF design report (jsPDF, loaded on demand)
js/app.js           UI controller
tests/              Node sanity checks
```

## Roadmap

- ~~v2: 2D temperature map, discrete heat sources, TIM layer~~ (done)
- Flow distribution between parallel channels
- Side-by-side design comparison, parameter sweeps, CSV export
- Dielectric coolants and user-defined fluids; pin fins and turbulators
