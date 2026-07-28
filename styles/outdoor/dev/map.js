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
