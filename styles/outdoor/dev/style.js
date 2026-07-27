const OFM_DOMAIN = 'tiles.openfreemap.org'

/**
 * Load a style from its raw JSON text, replacing __TILEJSON_DOMAIN__
 * placeholders and stripping map/viewport metadata.
 */
export function loadStyle(rawText) {
  const modifiedText = rawText.replace(/__TILEJSON_DOMAIN__/g, OFM_DOMAIN)
  const data = JSON.parse(modifiedText)

  delete data.bearing
  delete data.center
  delete data.zoom
  delete data.pitch
  delete data.metadata
  delete data.name
  delete data.id

  return data
}
