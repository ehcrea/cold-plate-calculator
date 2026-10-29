# Cold Plate Calculator

**Live:** https://ehcrea.github.io/cold-plate-calculator/

A browser-based tool for sizing liquid- and gas-cooled cold plates for **power electronics**, **battery modules** and **fuel-cell systems**. Enter the plate, channel layout and coolant, and it estimates:

- **Max. heat dissipation** at a given surface temperature limit, or **peak surface temperature** at a given heat load
- Coolant outlet temperature, pressure drop and its breakdown, and hydraulic pump power
- Thermal resistance breakdown (coolant capacity, convection, wall conduction, lateral spreading)
- Reynolds number, flow regime, heat-transfer coefficient, fin efficiency and NTU
- Heat and pressure-drop curves against flow rate
- Design warnings: erosion velocity, freezing and boiling margins, manifold maldistribution, Mach number and gas compressibility, material compatibility

Switches between **SI and Imperial** units. **Export PDF** downloads a design report (inputs, results, plate drawing, breakdowns, performance curves, design checks), and every design can be shared as a link.

> **v1 is a 1D engineering estimate (±20–30 %)** meant for concept sizing. Validate final designs with CFD or testing.

## Inputs

| Group | Options |
|---|---|
| Plate | Length × width × thickness. Al 6061 / 6063 / 3003 / 1100, Cu C110 / C101, SS 304 / 316L, Ti Gr 2, or a custom material |
| Layout | Serpentine (1–6 parallel circuits), parallel Z-type, parallel U-type. Channels can run along the length or the width; edge margin, header size, port diameter and mirrored ports are adjustable |
| Channel | Round, square or rectangular section; wall thickness to the heated face; wall roughness |
| Coolant | Water (DI), ethylene glycol 30/50 %, propylene glycol 30/50 %, clean dry air, N₂, H₂. Inlet temperature and pressure; flow as volume, mass or standard flow (SLPM/SCFM) |
| Thermal | Find max. heat (from a surface temperature limit) or find surface temperature (from a heat load). Heat applied over the whole face or the channel area only |

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
| Other losses | Channel entry/exit K = 0.5 + 1.0; headers K = 1.0 each; ports K = 1.5 each |
| Plate conduction | Heated-face wall conduction, channel side walls as fins, lateral spreading between channels and at the edges |
| Plate temperature | Blends between the uniform-heat-flux limit (conservative) and the isothermal-plate ε-NTU limit (ideal), based on the plate's lateral conductance vs. the coolant heat capacity rate |
| Fluid properties | Temperature-dependent tables for liquids. Ideal gas with Sutherland viscosity for gases. Evaluated at the mean bulk temperature |

**Not modelled:** TIM and contact resistance, discrete heat sources and hot spots, flow maldistribution (warning only), two-phase flow, turbulators and pin fins, gas compressibility within the plate.

## Project layout

```
index.html          page structure
css/style.css       styles (light/dark, responsive, print)
js/units.js         SI ↔ Imperial conversion
js/data.js          fluids, materials, presets
js/physics.js       thermal / hydraulic solver (also runs in Node)
js/drawing.js       plate top view and cross-section (SVG)
js/charts.js        performance curves (SVG)
js/report.js        PDF design report (jsPDF, loaded on demand)
js/app.js           UI controller
tests/              Node sanity checks
```

## Roadmap

- **v2:** 2D finite-difference temperature map, discrete heat-source footprints, TIM layer
- **v3:** side-by-side design comparison, CSV/PDF report export, saved design library
