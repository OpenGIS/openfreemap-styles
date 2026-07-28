<script setup>
import { ref, onMounted } from 'vue'
import { loadStyle } from './style.js'
import { setupContours } from './map.js'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import MaplibreCompare from '@maplibre/maplibre-gl-compare'
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css'

import libertyStyleRaw from '/styles/liberty/style.json?raw'
import outdoorStyleRaw from '../style.json?raw'

const compareEl = ref(null)

onMounted(async () => {
  const leftStyle = loadStyle(libertyStyleRaw)
  const rightStyle = loadStyle(outdoorStyleRaw)

  // Detect contour implementation from the style itself. If the contour
  // source uses dem-contour:// protocol, register the maplibre-contour
  // plugin and apply any unit patching BEFORE the map parses the style.
  // This stays in sync with whatever CONTOURS_USE_PLUGIN was set to at
  // build time — no manual flag coordination needed.
  const usesContourPlugin = rightStyle?.sources?.['contour-source']?.tiles?.some(
    t => typeof t === 'string' && t.startsWith('dem-contour://'),
  )
  if (usesContourPlugin) {
    setupContours(rightStyle, 'imperial')
  }

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

  new MaplibreCompare(leftMap, rightMap, compareEl.value, {})

  leftMap.once('idle', () => {
    rightMap.jumpTo({
      center: leftMap.getCenter(),
      zoom: leftMap.getZoom(),
    })
  })
})
</script>

<template>
  <div ref="compareEl" id="compare">
    <div id="left" class="map"></div>
    <div id="right" class="map"></div>
  </div>
</template>

<style>
@import './reset.css';
@import './style.css';
</style>
