# OpenFreeMap Outdoor

An activity-oriented map style built on [Liberty](https://github.com/maputnik/osm-liberty). Adds terrain, contour lines, trail visibility, and activity overlays for hiking, cycling, and MTB.

## Quick start

```bash
npm install
npm run dev
```

Opens the compare app at [localhost:11000](http://localhost:11000) — Liberty on the left, Outdoor on the right. Editing `build-outdoor.mjs` or the Liberty base style triggers an automatic rebuild and full page reload.

## Scripts

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Start Vite dev server with hot refresh on port 11000 |
| `npm run build` | Build the compare app for production                 |
| `npm run style` | Run the build script once (generates `style.json`)   |

## How it works

The build script (`build-outdoor.mjs`) reads the Liberty base style, applies outdoor modifications, and writes `style.json`. Feature flags at the top of the script enable/disable sections — terrain, contours, path promotion, MTB scale, and waymarked trail overlays.

The Vite dev server auto-runs the build script on start and watches both `build-outdoor.mjs` and the Liberty base for changes.

## Contours

The outdoor style includes contour lines. Two modes are available at build time:

- **PBF** (default) — direct vector tiles from a local [contour-mvt-server](https://github.com/acalcutt/contour-mvt-server). Run `contours/` separately on port 11001.
- **Plugin** — client-side contours via the [maplibre-contour](https://github.com/onthegomap/maplibre-contour) plugin. Set `CONTOURS = 'plugin'` in `build-outdoor.mjs`.

See [contours/README.md](contours/README.md) for server setup.

## Dependencies

- [Vite](https://vitejs.dev/) — dev server and bundler
- [Vue 3](https://vuejs.org/) — component framework
- [MapLibre GL JS](https://maplibre.org/) — map renderer
- [@maplibre/maplibre-gl-compare](https://github.com/maplibre/maplibre-gl-compare) — side-by-side comparison

## Project structure

```
styles/outdoor/
├── build-outdoor.mjs   # Style build script
├── contours/            # Self-hosted contour tile server
├── index.html           # Compare app entry
├── src/
│   ├── App.vue          # Root Vue component
│   ├── style.js         # Style loader (replaces __TILEJSON_DOMAIN__)
│   ├── map.js           # Map setup & contour plugin
│   ├── reset.css        # CSS reset
│   └── style.css        # App styles
├── style.json           # Generated output (gitignored)
└── package.json
```
