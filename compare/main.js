import './reset.css'
import './style.css'

import { setupMap, setupContours } from './map.js'
import { loadStyle } from './style.js'

let left
let right

// left = await loadStyle('/styles/fiord/style.json')

// right = await loadStyle('/styles/positron/style.json')
// right = await loadStyle('/styles/dark/style.json')

// right = await loadStyle('/styles/positron/style.json')
// right = await loadStyle('/styles/positron/omt_orig_linted.json')

// right = await loadStyle('/styles/dark/style.json')
// right = await loadStyle('/dark/omt_orig_linted.json')

left = await loadStyle('/styles/liberty/style.json')

right = await loadStyle('/styles/outdoors/style.json')
// Comment to disable
setupContours(right)

setupMap(left, right)
