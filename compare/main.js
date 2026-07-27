import './reset.css'
import './style.css'

import { setupMap, setupContours } from './map.js'
import { loadStyle } from './style.js'

import libertyStyleRaw from './styles/liberty/style.json?raw'
import outdoorStyleRaw from './styles/outdoor/style.json?raw'

//
;(async () => {
  let left
  let right

  // left = await loadStyle('/styles/fiord/style.json')

  // right = await loadStyle('/styles/positron/style.json')
  // right = await loadStyle('/styles/dark/style.json')

  // right = await loadStyle('/styles/positron/style.json')
  // right = await loadStyle('/styles/positron/omt_orig_linted.json')

  // right = await loadStyle('/styles/dark/style.json')
  // right = await loadStyle('/dark/omt_orig_linted.json')

  left = loadStyle(libertyStyleRaw)

  right = loadStyle(outdoorStyleRaw)
  // Comment to disable
  // setupContours(right)

  setupMap(left, right)
})()
