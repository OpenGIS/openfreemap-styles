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

let _contourPluginRegistered = false

/**
 * Register the maplibre-contour plugin and optionally apply imperial
 * unit overrides to a built style object.
 *
 * The plugin registers the dem-contour:// protocol handler so contour
 * tiles are generated client-side from DEM data. The style.json
 * already contains the full contour source definition with an encoded
 * protocol URL, so this step is required before any map loads that
 * style.
 *
 * Idempotent — subsequent calls are no-ops (the protocol handler only
 * needs to be registered once per page load).
 *
 * For imperial units, the style is patched before the map loads it:
 *   — A multiplier query param is injected into the contour source URL,
 *     converting metres to feet inside the contour algorithm.
 *   — The label suffix is changed from 'm' to 'ft'.
 *
 * @param {object|null} style  Style object to patch for imperial units,
 *                             or null to skip patching.
 * @param {string}      units  'metric' (default) or 'imperial'
 */
export function setupContours(style = null, units = 'metric') {
  if (!_contourPluginRegistered) {
    const demSource = new mlcontour.DemSource({
      url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
      encoding: 'terrarium',
      maxzoom: 20,
      worker: true,
    })

    demSource.setupMaplibre(maplibregl)
    _contourPluginRegistered = true
  }

  if (units === 'imperial' && style && style.sources && style.sources['contour-source']) {
    const source = style.sources['contour-source']
    if (source.tiles) {
      source.tiles = source.tiles.map(t =>
        t.includes('?') ? `${t}&multiplier=3.28084` : `${t}?multiplier=3.28084`,
      )
    }

    const labelLayer = style.layers && style.layers.find(l => l.id === 'contour-labels')
    if (labelLayer && labelLayer.layout) {
      labelLayer.layout['text-field'] = [
        'concat',
        ['number-format', ['get', 'ele'], {}],
        'ft',
      ]
    }
  }
}
