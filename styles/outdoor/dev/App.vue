<script setup>
import { ref, onMounted } from 'vue'
import { loadStyle } from './style.js'
import { setupContours } from '../scripts/contours.js'
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

  // Register plugin & patch for imperial units BEFORE the map parses
  // the style. setupContours handles both plugin and PBF modes
  // internally — it detects contour mode from the style itself.
  setupContours(rightStyle, 'imperial')

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
