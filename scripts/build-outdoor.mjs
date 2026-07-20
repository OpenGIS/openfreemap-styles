#!/usr/bin/env node

/**
 * Build the outdoor style from the liberty base.
 *
 * Reads styles/liberty/style.json, applies all outdoor-specific
 * modifications (terrain source + hillshade, contour source + layers,
 * mtb:scale overlay, bicycle access overlay, path/track re-styling,
 * path name label colouring), and writes to styles/outdoor/style.json.
 *
 * Contour source uses a placeholder tile URL — maplibre-contour
 * registers a runtime protocol handler and replaces the URL at page
 * load (see compare/main.js for the runtime setup).
 *
 * Usage:
 *   node scripts/build-outdoor.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const libertyPath = resolve(ROOT, 'styles/liberty/style.json')
const outdoorPath = resolve(ROOT, 'styles/outdoor/style.json')

// ── Setup

const COLOURS = {
  // Paths & trails
  PATH: '#c05a2a',

  // MTB scale difficulty overlay
  MTB_GRADE_1: 'blue',
  MTB_GRADE_2: 'red',
  MTB_GRADE_3_PLUS: 'black',

  // Bicycle access overlay
  BICYCLE_ACCESS: '#8c64bd',

  // Contour lines & labels
  CONTOUR_MINOR: 'rgb(126, 124, 121)',
  CONTOUR_INDEX: 'rgb(124, 122, 121)',
  CONTOUR_LABEL: '#5c5c5c',
  CONTOUR_HALO: 'rgba(255, 255, 255, 0.85)',
}

const WAYMARKED_ACTIVITIES = ['hiking', 'cycling', 'mtb', 'skating', 'riding', 'slopes']

// ── 1. Read & deep-clone liberty ──
const liberty = JSON.parse(readFileSync(libertyPath, 'utf8'))
const style = JSON.parse(JSON.stringify(liberty))

// ════════════════════════════════════════════════════════════════════
// Terrain & hillshade
// ════════════════════════════════════════════════════════════════════

// ── 2. Terrain source — raster DEM from Mapterhorn ──
// https://github.com/mapterhorn/mapterhorn
// Alternative (https://registry.opendata.aws/terrain-tiles/)
// https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
style.sources.terrainSource = {
  type: 'raster-dem',
  tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
  encoding: 'terrarium',
  tileSize: 512,
  maxzoom: 15,
}

// ── 3. Terrain exaggeration — subtle 3D bump ──
style.terrain = { source: 'terrainSource', exaggeration: 1.5 }

// ── 4. Hillshade layer (appended; draws on top of all 2D layers) ──
style.layers.push({
  id: 'hillshade-layer',
  type: 'hillshade',
  source: 'terrainSource',
  paint: { 'hillshade-exaggeration': 0.2 },
})

// ════════════════════════════════════════════════════════════════════
// Contours — source + layers (placeholder URL; replaced at runtime)
// ════════════════════════════════════════════════════════════════════

// https://github.com/onthegomap/maplibre-contour
// At runtime maplibre-contour registers the mlcontour:// protocol and
// generates tile URLs on-the-fly from DEM data. The URL is replaced
// at runtime after demSource.setupMaplibre() and
// demSource.contourProtocolUrl() are called.

// ── 5. Contour source (vector tiles from DEM via maplibre-contour) ──
style.sources['contour-source'] = {
  type: 'vector',
  minzoom: 10,
  tiles: ['mlcontour://placeholder/contours/{z}/{x}/{y}.pbf'],
  maxzoom: 15,
}

// ── 6. Contour layers (appended after hillshade) ──
style.layers.push(
  // Minor contour lines (index 0 = normal interval)
  {
    id: 'contour-lines',
    type: 'line',
    source: 'contour-source',
    'source-layer': 'contours',
    minzoom: 10,
    filter: ['==', ['get', 'level'], 0],
    paint: {
      'line-color': COLOURS.CONTOUR_MINOR,
      'line-opacity': 0.25,
      'line-width': 0.5,
    },
  },
  // Index contour lines (thicker, every 5th)
  {
    id: 'contour-lines-index',
    type: 'line',
    source: 'contour-source',
    'source-layer': 'contours',
    minzoom: 10,
    filter: ['>', ['get', 'level'], 0],
    paint: {
      'line-color': COLOURS.CONTOUR_INDEX,
      'line-opacity': 0.1,
      'line-width': 1.0,
    },
  },
  // Contour elevation labels on index lines
  {
    id: 'contour-labels',
    type: 'symbol',
    source: 'contour-source',
    'source-layer': 'contours',
    minzoom: 11,
    filter: ['>', ['get', 'level'], 0],
    layout: {
      'symbol-placement': 'line',
      'symbol-avoid-edges': true,
      'text-rotation-alignment': 'map',
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 6, 18, 10],
      'text-field': ['concat', ['number-format', ['get', 'ele'], {}], 'm'],
      'text-font': ['Noto Sans Regular'],
      'text-padding': 0,
    },
    paint: {
      'text-color': COLOURS.CONTOUR_LABEL,
      'text-halo-color': COLOURS.CONTOUR_HALO,
      'text-halo-width': 1.25,
    },
  },
)

// ════════════════════════════════════════════════════════════════════
// Waymarked Trails — hiking/cycling raster overlay
// ════════════════════════════════════════════════════════════════════

// ── 7. Waymarked Trails — add activity raster tiles ──
for (const activity of WAYMARKED_ACTIVITIES) {
  const sourceId = `waymarked-${activity}`
  style.sources[sourceId] = {
    type: 'raster',
    tiles: [`https://tile.waymarkedtrails.org/${activity}/{z}/{x}/{y}.png`],
    tileSize: 256,
    attribution: '© waymarkedtrails.org',
  }

  style.layers.push({
    id: `${sourceId}-layer`,
    type: 'raster',
    source: sourceId,
    paint: {
      'raster-opacity': 0.7,
    },
  })
}

// ════════════════════════════════════════════════════════════════════
// Activity overlays — MTB & bicycle
// ════════════════════════════════════════════════════════════════════
// These are inserted BEFORE poi_r20 so they sit above roads but below
// POI labels.

// Activity layers use minzoom 0 / maxzoom 22 so they render at every
// zoom where the tag data exists in the tile — no artificial gating.

// ── 8. MTB scale — trail difficulty overlay ──
// From: https://github.com/hyperknot/openfreemap/issues/31#issuecomment-4649028862
// Coloured by mtb:scale value (see COLOURS.MTB_GRADE_*)
// Not exhaustive: mtb:scale:imba is not covered for example.
//   https://wiki.openstreetmap.org/wiki/Key:mtb:scale
//   https://wiki.openstreetmap.org/wiki/Key:mtb:scale:imba
const mtbLayer = {
  id: 'mtb_scale-casing',
  type: 'line',
  metadata: { 'mapbox:group': '1444849345966.4436' },
  source: 'openmaptiles',
  'source-layer': 'transportation',
  minzoom: 0,
  maxzoom: 22,
  filter: ['all', ['==', '$type', 'LineString'], ['!=', 'brunnel', 'tunnel'], ['has', 'mtb_scale']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': [
      'match',
      ['get', 'mtb_scale'],
      '1',
      COLOURS.MTB_GRADE_1,
      '2',
      COLOURS.MTB_GRADE_2,
      COLOURS.MTB_GRADE_3_PLUS,
    ],
    'line-opacity': 0.8,
    'line-width': {
      base: 1.2,
      stops: [
        [12, 0.5],
        [16, 3],
      ],
    },
  },
}

// ── 9. Bicycle access — tracks tagged with bicycle=* ──
// A single bold line (COLOURS.BICYCLE_ACCESS) for any trail tagged with bicycle=*
// (designated, yes, permissive, etc.). Roads excluded — bicycle tags
// are common on roads too, but this spotlights trails.
// Excludes path-class features (already styled by road_path_pedestrian)
// so only tracks get the overlay.
//   https://wiki.openstreetmap.org/wiki/Key:bicycle
const bicycleLayer = {
  id: 'bicycle-access',
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'transportation',
  minzoom: 0,
  maxzoom: 22,
  filter: [
    'all',
    ['==', '$type', 'LineString'],
    ['!=', 'brunnel', 'tunnel'],
    ['has', 'bicycle'],
    ['in', 'class', 'track'],
  ],
  paint: {
    'line-color': COLOURS.BICYCLE_ACCESS,
    'line-opacity': 0.7,
    'line-width': 2,
  },
}

// Insert before poi_r20
const poiIdx = style.layers.findIndex(l => l.id === 'poi_r20')
if (poiIdx !== -1) {
  style.layers.splice(poiIdx, 0, bicycleLayer, mtbLayer)
} else {
  style.layers.push(bicycleLayer, mtbLayer)
}

// ════════════════════════════════════════════════════════════════════
// Path & trail styling
// ════════════════════════════════════════════════════════════════════

// ── 10. Path/track highlighting — modify road_path_pedestrian ──
// Philosophy: if the tile has trail data, display it. No zoom
// filtering, no fade-in — loud and proud at all zoom levels.
//
// OpenMapTiles includes path data in tiles from z12 (route members),
// z13 (named/routed/sac_scale), and z14+ (all paths).
//   https://github.com/openmaptiles/openmaptiles/pull/1190
//   https://github.com/openmaptiles/openmaptiles/pull/1334
//
// MTB-scale trails get opacity 0 (they're drawn by the dedicated MTB
// layer above), so paths and mtb:scale trails don't double-up.
const pathLayer = style.layers.find(l => l.id === 'road_path_pedestrian')
if (pathLayer) {
  pathLayer.minzoom = 0
  pathLayer.maxzoom = 22
  pathLayer.paint = pathLayer.paint || {}
  pathLayer.paint['line-color'] = COLOURS.PATH
  pathLayer.paint['line-opacity'] = ['case', ['has', 'mtb_scale'], 0, 1]
  pathLayer.paint['line-width'] = [
    'interpolate',
    ['exponential', 1.2],
    ['zoom'],
    12,
    1,
    14,
    2,
    20,
    8,
  ]
}

// ── 11. Path name labels — modify highway-name-path ──
// Match the path line colour so names read as part of the same feature.
const nameLayer = style.layers.find(l => l.id === 'highway-name-path')
if (nameLayer) {
  nameLayer.minzoom = 0
  nameLayer.maxzoom = 22
  nameLayer.paint = nameLayer.paint || {}
  nameLayer.paint['text-color'] = COLOURS.PATH
}

// ════════════════════════════════════════════════════════════════════
// Write
// ════════════════════════════════════════════════════════════════════

writeFileSync(outdoorPath, `${JSON.stringify(style, null, 2)}\n`, 'utf8')

console.log(`✓ outdoor style written to ${outdoorPath}`)
console.log(`  layers: ${style.layers.length} (was ${liberty.layers.length})`)
console.log(
  `  sources: ${Object.keys(style.sources).length} (was ${Object.keys(liberty.sources).length})`,
)
