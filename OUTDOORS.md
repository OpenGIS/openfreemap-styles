# `styles/outdoor/style.json`

- Uses Liberty as a base (upstream actively maintained).
- Adds hillshading/exaggeration (raster DEM from Mapterhorn).
- Adds "activity" overlays. Minimal cycling example:
  - MTB difficulty (blue/red/black).
  - Increase visibility of bicycle access tags (purple).
- Increases visibility of all **paths** (and path labels) at all zooms (red dotted).

# Add

- Adds countour line/label definitions (rendering requires `maplibre-contour` at runtime)
