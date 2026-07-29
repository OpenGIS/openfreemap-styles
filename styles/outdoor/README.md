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

The build script (`scripts/build.mjs`) reads the Liberty base style, applies outdoor modifications, and writes `style.json`. Feature flags at the top of the script enable/disable sections — terrain, contours, path promotion, MTB scale, waymarked trail overlays, and TrailSplits overlays. Source URL toggles (`CONTOUR_PBF_USE_LOCAL`, `POI_USE_LOCAL`) switch between remote APIs and self-hosted tile servers.

Running `npm run dev` starts Vite (HMR on `style.json`) alongside `scripts/watch.mjs`, which watches `scripts/build.mjs` and `styles/liberty/style.json`. When either changes — e.g. you flip a feature flag — it runs the build automatically, and Vite pushes the updated `style.json` to the browser. No manual build step, no extra terminal tab.

## Contours

The outdoor style includes contour lines. Toggle between two implementations
via `CONTOURS_USE_PLUGIN` in `scripts/build.mjs`:

| Toggle | Approach | Unit support |
|--------|----------|-------------|
| `CONTOURS_USE_PLUGIN = true` (default) | **Plugin** — client-side [maplibre-contour](https://github.com/onthegomap/maplibre-contour) generates contours on the GPU from raw DEM tiles | Runtime via `setupContours(style, 'imperial')` in `scripts/contours.js` |
| `CONTOURS_USE_PLUGIN = false` + `CONTOUR_PBF_USE_LOCAL = true` (default) | **PBF local** — self-hosted [contour-mvt-server](contours/) on port 11001 | Runtime via `setupContours(style, 'imperial')` in `scripts/contours.js` |
| `CONTOURS_USE_PLUGIN = false` + `CONTOUR_PBF_USE_LOCAL = false` | **PBF remote** — TrailSplits API (free, caps at z12) | Runtime via `setupContours(style, 'imperial')` in `scripts/contours.js` |

See [CONTOURS_PBF.md](CONTOURS_PBF.md) for PBF-specific limitations and setup.

## TrailSplits overlays

Vector tile overlays from the free [TrailSplits API](https://trailsplits.com/api) (no key required) or self-hosted alternatives:

| Toggle | Description | Source-layer | Features |
|--------|-------------|-------------|----------|
| `TRAILSPLITS_HIKING_TRAILS` | Hiking/cycling trail networks | `hiking_network` | Line layers coloured by network tier — `iwn` (red), `nwn` (blue), `rwn` (green), `lwn`/default (grey) |
| `TRAILSPLITS_OUTDOOR_POI` | Outdoor points of interest | `outdoor_pois` | Symbol markers for huts, water sources, shelters, parking, viewpoints, passes |

Both default to `true`. The POI source URL is controlled by `POI_USE_LOCAL`:
- `POI_USE_LOCAL = false` (default) — TrailSplits API
- `POI_USE_LOCAL = true` — self-hosted [Planetiler tiles](pois/) on port 11002

The PBF contour source URL is controlled by `CONTOUR_PBF_USE_LOCAL` (see [Contours](#contours)).

## Self-hosted POI tiles

The `pois/` sub-project generates outdoor POI vector tiles from OSM data using [Planetiler](https://github.com/onthegomap/planetiler). This provides the same POI overlay as the TrailSplits API but self-hosted:

```bash
cd pois
npm install                # one-time setup
npm run build              # build .pmtiles (requires JDK 21+)
npm start                  # serves tiles on port 11002
```

Set `POI_USE_LOCAL = true` in `scripts/build.mjs` to use local tiles instead of the TrailSplits API. See [pois/README.md](pois/README.md) for details.

## Dependencies

- [Vite](https://vitejs.dev/) — dev server and bundler
- [Vue 3](https://vuejs.org/) — component framework
- [MapLibre GL JS](https://maplibre.org/) — map renderer
- [@maplibre/maplibre-gl-compare](https://github.com/maplibre/maplibre-gl-compare) — side-by-side comparison

## Project structure

```
styles/outdoor/
├── contours/            # Self-hosted contour tile server
├── pois/                # Self-hosted outdoor POI tile generator (Planetiler)
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
