<script setup>
import { ref, onMounted } from 'vue'
import { loadStyle } from './style.js'

import libertyStyleRaw from '/styles/liberty/style.json?raw'
import outdoorStyleRaw from '../style.json?raw'

const compareEl = ref(null)

onMounted(async () => {
  const leftStyle = loadStyle(libertyStyleRaw)
  const rightStyle = loadStyle(outdoorStyleRaw)

  // Uncomment to use client-side contour plugin instead of PBF tiles:
  // setupContours(rightStyle)

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

  new maplibregl.Compare(leftMap, rightMap, compareEl.value, {})

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
