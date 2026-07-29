# Outdoor POI Vector Tiles

Self-hosted outdoor points of interest (huts, shelters, water, parking, viewpoints, mountain passes) for the OpenFreeMap outdoor style. Uses [Planetiler](https://github.com/onthegomap/planetiler) to generate vector tiles from OSM data via a YAML custom schema.

## Quick start

```bash
cd styles/outdoor/pois
npm install            # one-time setup
npm run build          # generate outdoor_pois.pmtiles (requires JDK 21+)
npm start              # starts on port 11002
```

### Prerequisites

- **JDK 21+** — [Adoptium](https://adoptium.net/) / [SDKMAN](https://sdkman.io/)
- **Node.js** 18+

The build script downloads the Planetiler JAR automatically on first run.

## Verify

```bash
curl http://localhost:11002/health
# {"status":"ok","archive":"outdoor_pois.pmtiles","port":11002}

curl -sS -o /dev/null -w "%{http_code} %{size_download}B" \
  "http://localhost:11002/12/2207/1538.pbf"
# 200 1234B
```

## Build options

```bash
# Custom bounding box
node scripts/build.mjs --bounds=10.48,45.27,11.78,46.18

# Default bounds: Venetian Prealps, NE Italy
```

## Schema

`schema.yml` defines an `outdoor_pois` layer with point geometry and a `kind` attribute:

| kind       | OSM tags                                | minzoom |
|------------|-----------------------------------------|---------|
| `hut`      | `tourism=alpine_hut`, `wilderness_hut`  | 8       |
| `water`    | `amenity=drinking_water`                | 10      |
| `shelter`  | `amenity=shelter`                       | 10      |
| `parking`  | `amenity=parking`                       | 10      |
| `viewpoint`| `tourism=viewpoint`                     | 10      |
| `pass`     | `natural=saddle`                        | 8       |

All features include `name` and `ele` (elevation in metres) where available.

## Usage in style

The outdoor build script (`scripts/build.mjs`) uses the local URL when `POI_USE_LOCAL = true`:

```js
const POI_USE_LOCAL = true
const POI_LOCAL_URL = 'http://localhost:11002/{z}/{x}/{y}.pbf'
```

## Stop

```bash
kill $(lsof -ti:11002)
```
