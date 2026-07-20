import mlcontour from 'maplibre-contour'

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

  window.leftMap = leftMap
  window.rightMap = rightMap

  window.compare = new maplibregl.Compare(leftMap, rightMap, '#compare', {
    // mousemove: true,
  })

  // Sync right map to left map once it's settled (handles hash-driven positioning)
  leftMap.once('idle', () => {
    rightMap.jumpTo({
      center: leftMap.getCenter(),
      zoom: leftMap.getZoom(),
    })
  })
}

export function setupContours(style) {
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
