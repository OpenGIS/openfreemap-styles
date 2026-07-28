# OpenFreeMap Outdoor

An activity-oriented map style built on [Liberty](https://github.com/maputnik/osm-liberty). Adds terrain, contour lines, trail visibility, and activity overlays for hiking, cycling, and MTB.

## Quick start

```bash
npm install
npm run dev
```

Opens the compare app at [localhost:11000](http://localhost:11000) — Liberty on the left, Outdoor on the right. Edit `style.json` directly for quick style tweaks — Vite HMR updates instantly. Change feature flags in `scripts/build.mjs` and the watcher automatically rebuilds `style.json` and triggers HMR — no manual build step needed.

## Scripts

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Vite dev server + file watcher. HMR on `style.json` change; auto-rebuild on `build.mjs` / `liberty/style.json` changes  |
| `npm run build`        | One-shot build `style.json` from `build.mjs` feature flags  |
| `npm run watch:build`  | Standalone file watcher (for separate terminal)              |
| `npm run demo:build`   | Build the compare app demo to `demo/` (`vite build`)        |
| `npm run demo:preview` | Preview the production build (`vite preview`)               |

The build script (`scripts/build.mjs`) reads the Liberty base style, applies outdoor modifications, and writes `style.json`. Feature flags at the top of the script enable/disable sections — terrain, contours, path promotion, MTB scale, and waymarked trail overlays.

Running `npm run dev` starts Vite (HMR on `style.json`) alongside `scripts/watch.mjs`, which watches `scripts/build.mjs` and `styles/liberty/style.json`. When either changes — e.g. you flip a feature flag — it runs the build automatically, and Vite pushes the updated `style.json` to the browser. No manual build step, no extra terminal tab.

## Contours

The outdoor style includes contour lines. Two modes are available at build time:

> [!NOTE]
> **Units:** Contours are currently metric-only (metre elevations, labels display `m`). To support imperial (feet), a runtime `multiplier` option (e.g. `3.28084`) and alternate label suffix (`ft`) would need to be added to the maplibre-contour configuration — planned for a future update.

- **PBF** (default) — direct vector tiles from a local [contour-mvt-server](https://github.com/acalcutt/contour-mvt-server). Run `contours/` separately on port 11001.
- **Plugin** — client-side contours via the [maplibre-contour](https://github.com/onthegomap/maplibre-contour) plugin. Set `CONTOURS = 'plugin'` in `scripts/build.mjs` within the outdoor sub-project.

See [contours/README.md](contours/README.md) for server setup.

## Dependencies

- [Vite](https://vitejs.dev/) — dev server and bundler
- [Vue 3](https://vuejs.org/) — component framework
- [MapLibre GL JS](https://maplibre.org/) — map renderer
- [@maplibre/maplibre-gl-compare](https://github.com/maplibre/maplibre-gl-compare) — side-by-side comparison

## Project structure

```
styles/outdoor/
├── contours/            # Self-hosted contour tile server
├── index.html           # Compare app entry
├── dev/
│   ├── App.vue          # Dev app root component
│   ├── style.js         # Style loader (replaces __TILEJSON_DOMAIN__)
│   ├── map.js           # Map setup & contour plugin
│   ├── reset.css        # CSS reset
│   └── style.css        # App styles
├── style.json           # Generated output (tracked in git)
├── demo/                # Production build output (tracked in git)
│   ├── index.html
│   └── assets/
└── package.json

scripts/
├── build.mjs            # Style build script
└── watch.mjs            # File watcher (auto-rebuild on change)
```
