import './reset.css'
import './style.css'

import { setupMap } from './map.js'
import { loadStyle } from './style.js'

// Contour setup (runtime: registers mlcontour:// protocol)
import mlcontour from 'maplibre-contour'

function setupContours(style) {
  const demSource = new mlcontour.DemSource({
    url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
    encoding: 'terrarium',
    maxzoom: 13,
    worker: true,
  })
  demSource.setupMaplibre(maplibregl)

  const contourTileUrl = demSource.contourProtocolUrl({
    thresholds: {
      0: [100, 500],
      5: [50, 250],
      10: [25, 100],
      15: [25, 100],
    },
    contourLayer: 'contours',
    elevationKey: 'ele',
    levelKey: 'level',
    extent: 4096,
    buffer: 1,
  })

  style.sources['contour-source'].tiles = [contourTileUrl]
}

let left
let right

// left = await loadStyle('/styles/fiord/style.json')

// right = await loadStyle('/styles/positron/style.json')
// right = await loadStyle('/styles/dark/style.json')

// right = await loadStyle('/styles/positron/style.json')
// right = await loadStyle('/styles/positron/omt_orig_linted.json')

// right = await loadStyle('/styles/dark/style.json')
// right = await loadStyle('/dark/omt_orig_linted.json')

left = await loadStyle('/styles/liberty/style.json')

right = await loadStyle('/styles/outdoor/style.json')
// Comment to disable
setupContours(right)

setupMap(left, right)
