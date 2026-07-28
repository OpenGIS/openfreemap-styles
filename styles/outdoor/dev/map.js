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
 * Initiate the maplibre-contour plugin.
 *
 * Registers the dem-contour:// protocol handler so contour tiles are
 * generated client-side from the DEM. The style.json already contains
 * the full contour source definition with an encoded protocol URL, so
 * this only needs to register the handler — no style object changes.
 */
export function setupContours() {
  const demSource = new mlcontour.DemSource({
    url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
    encoding: 'terrarium',
    maxzoom: 20,
    worker: true,
  })

  demSource.setupMaplibre(maplibregl)
}
