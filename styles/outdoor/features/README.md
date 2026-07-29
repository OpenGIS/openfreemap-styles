# Outdoor Feature Vector Tiles

Self-hosted vector tiles for outdoor features (POIs, hiking routes, etc.) for the OpenFreeMap outdoor style. Uses [Planetiler](https://github.com/onthegomap/planetiler) to generate vector tiles from OSM data via YAML custom schemas.

## Quick start

```bash
cd styles/outdoor/features
npm install            # one-time setup
npm run build          # generate outdoor_pois.pmtiles (requires JDK 21+)
npm run dev            # starts dev server on port 11002
```

### Prerequisites

- **JDK 21+** — [Adoptium](https://adoptium.net/) / [SDKMAN](https://sdkman.io/)
- **Node.js** 18+

The build script downloads the Planetiler JAR automatically on first run.

## Build

```bash
# Build POIs (default)
npm run build

# Build a specific feature
npm run build:pois
npm run build:routes

# Custom bounding box
node scripts/build.mjs --feature=routes --bounds=10.48,45.27,11.78,46.18
```

Each feature is defined by a `schema.yml` in its own directory under `features/<name>/`. The shared `.planetiler/` JAR cache and `data/` OSM extracts are reused across all features — no redundant downloads.

## Dev server

```bash
npm run dev            # starts on port 11002
```

Serves all available feature archives on separate paths:

| Path                           | Archive                |
|--------------------------------|------------------------|
| `/pois/{z}/{x}/{y}.pbf`       | `outdoor_pois.pmtiles` |
| `/routes/{z}/{x}/{y}.pbf`     | `outdoor_routes.pmtiles` |

### Verify

```bash
curl http://localhost:11002/health
# {"status":"ok","archives":["pois","routes"],"port":11002}

curl -sS -o /dev/null -w "%{http_code} %{size_download}B" \
  "http://localhost:11002/pois/12/2207/1538.pbf"
# 200 1234B
```

## Adding a new feature

Create a new directory with a `schema.yml`:

```
features/
├── scripts/...
├── pois/schema.yml
├── routes/schema.yml
└── myfeature/schema.yml    # new — just works
```

The build script auto-discovers it via `--feature=myfeature`, and the dev server automatically serves it on `/{feature}/{z}/{x}/{y}.pbf`.

## Schemas

### POIs

`pois/schema.yml` defines an `outdoor_pois` layer (point geometry, ~16 kinds):

| kind         | OSM tags                          | minzoom |
|--------------|-----------------------------------|---------|
| `hut`        | `tourism=alpine_hut`, `wilderness_hut` | 8    |
| `water`      | `amenity=drinking_water`          | 10      |
| `shelter`    | `amenity=shelter`                 | 10      |
| `parking`    | `amenity=parking`                 | 10      |
| `viewpoint`  | `tourism=viewpoint`               | 10      |
| `pass`       | `natural=saddle`                  | 8       |

### Routes

`routes/schema.yml` defines an `outdoor_routes` layer for hiking route relations.

## Usage in style

The outdoor build script (`scripts/build.mjs` in `styles/outdoor/`) uses local URLs when `POI_USE_LOCAL` / `ROUTE_USE_LOCAL` are `true`:

```js
const POI_LOCAL_URL = 'http://localhost:11002/pois/{z}/{x}/{y}.pbf'
const ROUTE_LOCAL_URL = 'http://localhost:11002/routes/{z}/{x}/{y}.pbf'
```

## Stop

```bash
kill $(lsof -ti:11002)
```
