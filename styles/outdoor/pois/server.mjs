#!/usr/bin/env node

/**
 * Dev server for outdoor POI PMTiles.
 *
 * Serves individual vector tiles from the Planetiler-generated
 * outdoor_pois.pmtiles archive as ZXY endpoints.
 *
 * Usage:
 *   node server.mjs          # port 11002
 *   node server.mjs --port 11003
 */

import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PMTiles } from 'pmtiles'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PMTILES_PATH = resolve(__dirname, 'outdoor_pois.pmtiles')
const DEFAULT_PORT = 11002

function getPort() {
  const arg = process.argv.find(a => a.startsWith('--port='))
  return arg ? parseInt(arg.split('=')[1], 10) : DEFAULT_PORT
}

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

function writeHead(res, status, extra = {}) {
  res.writeHead(status, { ...CORS_HEADERS, ...extra })
}

function notFound(res, msg = 'Not found') {
  writeHead(res, 404, { 'Content-Type': 'text/plain' })
  res.end(msg + '\n')
}

function serveTile(res, data) {
  writeHead(res, 200, {
    'Content-Type': 'application/x-protobuf',
    'Cache-Control': 'public, max-age=86400',
  })
  res.end(data)
}

async function main() {
  const port = getPort()

  if (!existsSync(PMTILES_PATH)) {
    console.error(`✗ PMTiles archive not found at ${PMTILES_PATH}`)
    console.error('  Run `npm run build` first to generate it.')
    process.exit(1)
  }

  // Read the full archive into memory and wrap as a source.
  // PMTiles FileSource is browser-oriented (expects File/Blob).
  // This custom source works in Node.js via Buffer.
  const fileBuf = readFileSync(PMTILES_PATH)
  const source = {
    getKey: () => 'outdoor_pois.pmtiles',
    getBytes: async (offset, length) => {
      const slice = fileBuf.subarray(offset, offset + length)
      return {
        data: slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength),
      }
    },
  }

  const archive = new PMTiles(source)

  let header
  try {
    header = await archive.getHeader()
    console.log(`✓ Loaded ${PMTILES_PATH}`)
    console.log(`  center:  ${header.centerLon.toFixed(4)}, ${header.centerLat.toFixed(4)}`)
    console.log(`  zoom:    ${header.minZoom} – ${header.maxZoom}`)
    console.log(`  layers:  ${header.numLayers}`)
  } catch (err) {
    console.error(`✗ Failed to open PMTiles archive:`, err.message)
    process.exit(1)
  }

  const server = createServer(async (req, res) => {
    // Health check
    if (req.url === '/health' || req.url === '/') {
      writeHead(res, 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', archive: 'outdoor_pois.pmtiles', port }))
      return
    }

    // Tile request: /{z}/{x}/{y}.pbf
    const match = req.url.match(/^\/(\d+)\/(\d+)\/(\d+)\.pbf$/)
    if (!match) {
      notFound(res, `Invalid tile URL: ${req.url}`)
      return
    }

    const z = parseInt(match[1], 10)
    const x = parseInt(match[2], 10)
    const y = parseInt(match[3], 10)

    try {
      const result = await archive.getZxy(z, x, y)
      if (!result || !result.data || result.data.byteLength === 0) {
        notFound(res, `No data for ${z}/${x}/${y}`)
        return
      }
      serveTile(res, Buffer.from(result.data))
      console.log(`  200 ${z}/${x}/${y}  ${result.data.byteLength}B`)
    } catch (err) {
      console.error(`  ERR ${z}/${x}/${y}: ${err.message}`)
      if (!res.headersSent) {
        writeHead(res, 500)
        res.end(err.message + '\n')
      }
    }
  })

  server.listen(port, () => {
    console.log(`\n═══ Outdoor POI Tile Server ═══`)
    console.log(`  URL:  http://localhost:${port}`)
    console.log(`  Tile: http://localhost:${port}/{z}/{x}/{y}.pbf`)
    console.log(`  Ctrl+C to stop\n`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
