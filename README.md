# Cold Plate Calculator

**Live:** https://ehcrea.github.io/cold-plate-calculator/

A browser-based tool for sizing liquid- and gas-cooled cold plates for **power electronics**, **battery modules** and **fuel-cell systems**. Enter the plate, channel layout and coolant, and it estimates:

- **Component temperatures**: place IGBT modules, diodes, battery modules or any heat source on the plate (drag them on the layout). For each one you get plate, case and junction temperature, margin to its limit, and how far total power can rise before the first limit is reached
- A **2D plate temperature map** with hover readout and the hottest point marked
- **Max. heat dissipation** at a given surface temperature limit, or **peak surface temperature** at a given heat load (uniform heating)
- **Pump curve matching**: pick or enter a pump or blower curve and the rest-of-loop pressure drop. The calculator finds the operating point where pump pressure equals plate plus loop pressure drop, and plots the pump curve against the system curve
- **Flow distribution** for parallel Z/U layouts: the flow in each channel from a manifold network model, shown as a bar chart and in the channel colours. Starved channels get less heat transfer and run hotter in the 2D map
- Coolant outlet temperature, pressure drop and its breakdown, and hydraulic pump power
- Thermal resistance breakdown (coolant capacity, convection, wall conduction, lateral spreading)
- Reynolds number, flow regime, heat-transfer coefficient, fin efficiency and NTU
- Heat and pressure-drop curves against flow rate
- **Step-by-step calculation**: every formula of the 1D model with the current design's numbers substituted (geometry, properties, Re, Nu, fin efficiency, resistance network, component temperatures, pressure drop), with literature references. Also included as an appendix in the PDF report, for design reviews and teaching
- **Parameter sweep**: vary one input (flow, channel count or size, plate thickness, inlet temperature, heat load, source power …) over a range and get the result, pressure drop, pump power and flow uniformity at each point, as charts and a table. Apply any point to the design with one click
- **Design comparison**: save up to four variants and compare them side by side with the current design; differing inputs are shaded and the best value in each row is highlighted
- **CSV export** of sweeps and comparisons; both are also included in the PDF report
- A short **Help** guide (how to use, reading the results, typical values) and an **About** page
- Design warnings: erosion velocity, freezing and boiling margins, manifold maldistribution, Mach number and gas compressibility, material compatibility

Available in **English, German, Dutch and Turkish**: the interface, design checks and PDF report, with local number formatting. Switches between **SI and Imperial** units, and between light and dark themes. It can be installed to a phone's home screen (iOS app icon and web app manifest included). **Export PDF** downloads a design report (inputs, results, plate drawing, breakdowns, performance curves, design checks), and every design can be shared as a link.

> **v2 is an engineering estimate:** a 2D plate conduction model coupled to 1D channel hydraulics, meant for concept sizing (roughly ±15–30 %). Validate final designs with CFD or testing.

## Inputs

| Group | Options |
|---|---|
| Plate | Length × width × thickness. Al 6061 / 6063 / 3003 / 1100, Cu C110 / C101, SS 304 / 316L, Ti Gr 2, or a custom material |
| Layout | Serpentine (1–6 parallel circuits), parallel Z-type, parallel U-type. Channels can run along the length or the width; edge margin, header size, port diameter and mirrored ports are adjustable |
| Channel | Round, square or rectangular section; wall thickness to the heated face; wall roughness |
| Coolant | Water (DI), ethylene glycol 30/50 %, propylene glycol 30/50 %. Dielectric fluids and oils: PAO, mineral oil, silicone oil, PFPE, HFE. Gases: clean dry air, N₂, H₂, He, CO₂. A custom liquid with your own properties. Inlet temperature and pressure. Flow as volume, mass or standard flow (SLPM/SCFM), or from a pump curve (generic pump and blower presets, or your own points) plus a rest-of-loop pressure drop that scales with flow² |
| Heat input | Discrete heat sources (power, position, footprint, R<sub>jc</sub>, temperature limit, and a thermal interface material chosen from a library: greases, phase-change, graphite, adhesive, insulating pad, gap pad and filler, solder, or custom, each with thickness, conductivity and contact resistance), or uniform heat over the whole face or the channel area, with find max. heat or find surface temperature |

12 application examples, grouped by industry:

| Group | Examples |
|---|---|
| Power electronics | Inverter / IGBT cold plate · EV on-board charger (SiC MOSFETs, transformer, inductor) · Industrial drive with three IGBT modules, sized with a pump curve |
| Data centre & computing | GPU / AI accelerator copper microchannel plate |
| Battery & energy storage | EV battery module (brazed) · Stationary storage (BESS) module |
| Fuel cell & hydrogen | Fuel-cell stack / DC-DC plate · Hydrogen gas-cooled plate · Air-cooled DC/DC plate with blower curve |
| RF, lasers & high flux | High-flux copper plate · GaN RF power amplifier (soldered transistors) |
| Aerospace & defence | Avionics chassis cold wall with PAO coolant |

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
| Manifolds (parallel layouts) | Headers are split into segments between channel junctions, each with friction plus a momentum term: the inlet header regains 1.0× the drop in velocity head, and the outlet header loses 2.0× the rise. Each channel follows its own Δp(q) curve (developing friction + entry/exit). Flows are iterated until they sum to the total, and the result sets the header pressure drop and the heat transfer in each channel |
| Other losses | Channel entry/exit K = 0.5 + 1.0; ports K = 1.5 each |
| 2D plate model | Finite-difference grid over the plate face (up to about 6,000 cells, solved with preconditioned conjugate gradient). In-plane conduction uses the local solid thickness. Cells above channels, port leads and headers are coupled to the coolant through the heated-face wall and the fin-corrected convective film. The coolant is marched along each channel path, and plate and coolant are solved alternately to convergence |
| Components | Case = average plate temperature under the footprint + P·(t<sub>TIM</sub>/k<sub>TIM</sub> + R″<sub>contact</sub>)/A. Junction = case + P·R<sub>jc</sub>. Headroom = the power scale factor at which the first component reaches its limit |
| Plate conduction (1D) | Heated-face wall conduction, channel side walls as fins, lateral spreading between channels and at the edges |
| Plate temperature | Blends between the uniform-heat-flux limit (conservative) and the isothermal-plate ε-NTU limit (ideal), based on the plate's lateral conductance vs. the coolant heat capacity rate |
| Fluid properties | Temperature-dependent tables for liquids. Ideal gas with Sutherland viscosity for gases. Evaluated at the mean bulk temperature |

The 1D model supplies the pressure drop, heat-transfer coefficient and resistance breakdown, plus a quick cross-check. The 2D model supplies the headline temperatures, the map and the component results.

**Not modelled:** spreading through the plate thickness under very small sources, contact resistance beyond the TIM layer, two-phase flow, turbulators and pin fins, gas compressibility within the plate.

## Project layout

```
index.html          page structure
css/style.css       styles (light/dark, responsive, print)
js/units.js         SI ↔ Imperial conversion
js/i18n.js          translations (EN, DE, NL, TR) and page-text translation
js/data.js          fluids, materials, presets
js/physics.js       1D thermal / hydraulic solver (also runs in Node)
js/physics2d.js     2D plate temperature model with heat sources (also runs in Node)
js/steps.js         step-by-step calculation: formulas with substituted values (also runs in Node)
js/study.js         parameter sweeps and design comparison (calculation part also runs in Node)
js/drawing.js       plate top view and cross-section (SVG)
js/charts.js        performance curves (SVG)
js/report.js        PDF design report (jsPDF, loaded on demand)
js/app.js           UI controller
tests/              Node sanity checks
icons/              favicon (SVG/PNG), iOS apple-touch-icon, PWA icons
```

## Roadmap

- ~~v2: 2D temperature map, discrete heat sources, TIM layer~~ (done)
- ~~Step-by-step calculation with formulas and references~~ (done)
- ~~Side-by-side design comparison, parameter sweeps, CSV export~~ (done)
- Inverse sizing (minimum flow or pressure drop for a temperature limit)
- Transient model (fast charge, overload and pulsed loads)
- Pin fins and turbulators

## Author and license

Made by Eren Tozlu, [ehcrea.com](https://ehcrea.com). Released under the [MIT License](LICENSE).
