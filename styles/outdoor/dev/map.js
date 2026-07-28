import mlcontour from 'maplibre-contour'
import maplibregl from 'maplibre-gl'

/**
 * Set up a side-by-side compare with two MapLibre maps.
 */
export function setupMap(leftStyle, rightStyle) {
  const leftMap = new maplibregl.Map({
    container: 'left',
    style: leftStyle,
    center: [9, 48],
    zoom: 3,
    hash: true,
  })

  const rightMap = new maplibregl.Map({
    container: 'right',
    style: rightStyle,
    center: [9, 48],
    zoom: 3,
  })

  const compare = new maplibregl.Compare(leftMap, rightMap, 'compare', {})

  // Sync right map to left once settled (handles hash-driven positioning)
  leftMap.once('idle', () => {
    rightMap.jumpTo({
      center: leftMap.getCenter(),
      zoom: leftMap.getZoom(),
    })
  })

  return { leftMap, rightMap, compare }
}

/**
 * Replace PBF contour source with client-side maplibre-contour plugin.
 * Only needed when using the 'plugin' contour mode at runtime.
 */
export function setupContours(style) {
  const demSource = new mlcontour.DemSource({
    url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
    encoding: 'terrarium',
    maxzoom: 20,
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
