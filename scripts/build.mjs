#!/usr/bin/env node

/**
 * Build the outdoor style from the liberty base.
 *
 * Reads styles/liberty/style.json (relative to the monorepo root),
 * applies all outdoor-specific modifications, and writes to
 * styles/outdoor/style.json.
 *
 * Feature flags at the top enable/disable each section. Data source
 * URLs are constants that can be swapped to change providers without
 * changing any section logic — see the commented alternatives.
 *
 * Sections are ordered from bottom to top in the render stack:
 *   terrain → contours → waymarked trails → mtb/bicycle → path styling
 *
 * Usage:
 *   node scripts/build.mjs          # one-shot build
 *   node scripts/build.mjs --watch  # rebuild on changes
 */

import { readFileSync, writeFileSync, watch } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const libertyPath = resolve(ROOT, 'styles/liberty/style.json')
const outdoorPath = resolve(ROOT, 'styles/outdoor/style.json')

// ═════════════════════════════════════════════════════════════════════════
// Feature toggles
// ═════════════════════════════════════════════════════════════════════════
// Flip these to enable/disable each feature section.

const TERRAIN = false // 3D terrain hillshading (raster DEM)
const CONTOURS = 'pbf' // 'plugin' (maplibre-contour), 'pbf' (direct PBF tiles), or false
const PROMOTE_PATHS = true // Paths/trails visible at all zoom levels
const MTB_SCALE = false // MTB difficulty + bicycle access overlays
const WAYMARKED_ACTIVITIES = [] // Raster overlays, e.g. ['hiking', 'cycling']

// ═════════════════════════════════════════════════════════════════════════
// Data source URLs
// ═════════════════════════════════════════════════════════════════════════
// Change a URL constant to swap providers — no section code changes needed.

// ── Terrain DEM (raster-elevation) ───────────────────────────────────
// Mapterhorn (Terrarium, 512px, maxzoom 15):
//   https://tiles.mapterhorn.com/{z}/{x}/{y}.webp
// AWS Terrarium (Terrarium, 256px, maxzoom 15):
//   https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
// TrailSplits TerrainRGB (Mapbox, 256px, maxzoom 12):
//   https://api.trailsplits.com/tiles/v1/terrainrgb/current/{z}/{x}/{y}.png
const TERRAIN_SOURCE_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
const TERRAIN_SOURCE_ENCODING = 'terrarium'
const TERRAIN_SOURCE_TILESIZE = 512
const TERRAIN_SOURCE_MAXZOOM = 15

// ── Plugin contours (maplibre-contour) ───────────────────────────────
// Uses the mlcontour:// protocol handler at runtime. The plugin generates
// contour tiles client-side from the DEM.
//   https://github.com/onthegomap/maplibre-contour
const CONTOUR_SOURCE_URL_PLUGIN = 'mlcontour://placeholder/contours/{z}/{x}/{y}.pbf'
const CONTOUR_SOURCE_PLUGIN_MAXZOOM = 15

// ── PBF contours (direct vector tiles, no plugin) ────────────────────
// Self-hosted contour-mvt-server (styles/outdoor/contours/). Runs
// on-demand from AWS Terrarium DEM tiles. 20 m minor / 100 m major
// intervals at z10-12, increasing detail at higher zooms.
// source-layer 'contours' with 'ele' and 'level' fields.
//
// TrailSplits API (fallback):
const CONTOUR_SOURCE_URL_PBF =
  'https://api.trailsplits.com/tiles/v1/contours/current/{z}/{x}/{y}.pbf'
// const CONTOUR_SOURCE_URL_PBF = 'http://localhost:11001/contours/terrain/{z}/{x}/{y}.pbf'
const CONTOUR_SOURCE_PBF_MAXZOOM = 14

// ═════════════════════════════════════════════════════════════════════════
// Colours
// ═════════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════════
// Setup — read & deep-clone the base style
// ═════════════════════════════════════════════════════════════════════════

function build() {
  const liberty = JSON.parse(readFileSync(libertyPath, 'utf8'))
  const style = JSON.parse(JSON.stringify(liberty))

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Terrain & hillshade  — bottom of render stack
  // ═══════════════════════════════════════════════════════════════════════
  if (TERRAIN) {
    style.sources.terrainSource = {
      type: 'raster-dem',
      tiles: [TERRAIN_SOURCE_URL],
      encoding: TERRAIN_SOURCE_ENCODING,
      tileSize: TERRAIN_SOURCE_TILESIZE,
      maxzoom: TERRAIN_SOURCE_MAXZOOM,
    }
    style.terrain = { source: 'terrainSource', exaggeration: 1.5 }
    style.layers.push({
      id: 'hillshade-layer',
      type: 'hillshade',
      source: 'terrainSource',
      paint: { 'hillshade-exaggeration': 0.2 },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Contours
  // ═══════════════════════════════════════════════════════════════════════
  const CONTOUR_FILTERS = {
    plugin: {
      minor: ['==', ['get', 'level'], 0],
      index: ['>', ['get', 'level'], 0],
    },
    pbf: {
      minor: ['!=', ['%', ['get', 'ele'], 100], 0],
      index: ['==', ['%', ['get', 'ele'], 100], 0],
    },
  }

  if (CONTOURS && CONTOUR_FILTERS[CONTOURS]) {
    const isPlugin = CONTOURS === 'plugin'
    const url = isPlugin ? CONTOUR_SOURCE_URL_PLUGIN : CONTOUR_SOURCE_URL_PBF
    const maxzoom = isPlugin ? CONTOUR_SOURCE_PLUGIN_MAXZOOM : CONTOUR_SOURCE_PBF_MAXZOOM
    const { minor, index } = CONTOUR_FILTERS[CONTOURS]

    style.sources['contour-source'] = {
      type: 'vector',
      minzoom: 10,
      tiles: [url],
      maxzoom,
    }

    style.layers.push(
      {
        id: 'contour-lines',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        minzoom: 10,
        filter: minor,
        paint: {
          'line-color': COLOURS.CONTOUR_MINOR,
          'line-opacity': 0.25,
          'line-width': 0.5,
        },
      },
      {
        id: 'contour-lines-index',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        minzoom: 10,
        filter: index,
        paint: {
          'line-color': COLOURS.CONTOUR_INDEX,
          'line-opacity': 0.1,
          'line-width': 1.0,
        },
      },
      {
        id: 'contour-labels',
        type: 'symbol',
        source: 'contour-source',
        'source-layer': 'contours',
        minzoom: 11,
        filter: index,
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
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Waymarked Trails
  // ═══════════════════════════════════════════════════════════════════════
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
      paint: { 'raster-opacity': 0.7 },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Activity overlays (inserted before poi_r20)
  // ═══════════════════════════════════════════════════════════════════════
  if (MTB_SCALE) {
    const mtbLayer = {
      id: 'mtb_scale-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 0,
      maxzoom: 22,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['!=', 'brunnel', 'tunnel'],
        ['has', 'mtb_scale'],
      ],
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

    const poiIdx = style.layers.findIndex(l => l.id === 'poi_r20')
    if (poiIdx !== -1) {
      style.layers.splice(poiIdx, 0, bicycleLayer, mtbLayer)
    } else {
      style.layers.push(bicycleLayer, mtbLayer)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Path & trail styling
  // ═══════════════════════════════════════════════════════════════════════
  if (PROMOTE_PATHS) {
    const pathLayer = style.layers.find(l => l.id === 'road_path_pedestrian')
    if (pathLayer) {
      pathLayer.minzoom = 0
      pathLayer.maxzoom = 22
      pathLayer.paint = pathLayer.paint || {}
      pathLayer.paint['line-color'] = COLOURS.PATH
      if (MTB_SCALE) {
        pathLayer.paint['line-opacity'] = ['case', ['has', 'mtb_scale'], 0, 1]
      }
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

    const nameLayer = style.layers.find(l => l.id === 'highway-name-path')
    if (nameLayer) {
      nameLayer.minzoom = 0
      nameLayer.maxzoom = 22
      nameLayer.paint = nameLayer.paint || {}
      nameLayer.paint['text-color'] = COLOURS.PATH
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Write
  // ═══════════════════════════════════════════════════════════════════════
  writeFileSync(outdoorPath, `${JSON.stringify(style, null, 2)}\n`, 'utf8')

  console.log(`✓ outdoor style written to ${outdoorPath}`)
  console.log(`  layers: ${style.layers.length} (was ${liberty.layers.length})`)
  console.log(
    `  sources: ${Object.keys(style.sources).length} (was ${Object.keys(liberty.sources).length})`,
  )
}

// ═════════════════════════════════════════════════════════════════════════
// CLI — build once, or watch for changes
// ═════════════════════════════════════════════════════════════════════════

const WATCH_FILES = [
  { path: new URL(import.meta.url).pathname, label: 'build script' },
  { path: libertyPath, label: 'liberty base' },
]

if (process.argv.includes('--watch')) {
  build()

  const debounced = new Set()

  for (const { path, label } of WATCH_FILES) {
    watch(path, () => {
      if (debounced.has(path)) return
      debounced.add(path)
      setTimeout(() => {
        debounced.delete(path)
        console.log(`\n  changed: ${label}`)
        build()
      }, 300)
    })
  }

  console.log('\nwatching for changes...')
} else {
  build()
}
