// Size budget check for the production build. Run after `npm run build`: `npm run size`.
// Units are KiB (1,024 bytes). Vite's build log uses kB (1,000 bytes), so its numbers look ~2% larger.
// Budgets: docs/IMPROVEMENT-PLAN.md §4.2. Change them deliberately, never to make a failing build pass.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const BUDGETS_KIB = {
  js: 85, // all JS, gzip
  fonts: 45, // woff2 files (already compressed)
  firstLoad: 130, // HTML + CSS + JS (gzip) + fonts. Was 120 in the plan (a brotli estimate); gzip is ~10% larger.
}

const dist = path.resolve('dist')
if (!fs.existsSync(dist)) {
  console.error('dist/ not found: run `npm run build` first.')
  process.exit(1)
}

const files = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => path.join(dir, f)) : [])
const gzip = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length
const raw = (file) => fs.statSync(file).size
const kib = (bytes) => bytes / 1024
const sum = (list, measure) => list.reduce((total, file) => total + measure(file), 0)

const assets = files(path.join(dist, 'assets'))
const js = sum(assets.filter((f) => f.endsWith('.js')), gzip)
const css = sum(assets.filter((f) => f.endsWith('.css')), gzip)
const html = gzip(path.join(dist, 'index.html'))
const fonts = sum(files(path.join(dist, 'fonts')).filter((f) => f.endsWith('.woff2')), raw)

const rows = [
  ['JS (gzip)', js, BUDGETS_KIB.js],
  ['Fonts (woff2)', fonts, BUDGETS_KIB.fonts],
  ['First load (HTML + CSS + JS + fonts)', html + css + js + fonts, BUDGETS_KIB.firstLoad],
]

let failed = false
for (const [name, bytes, budget] of rows) {
  const ok = kib(bytes) <= budget
  failed ||= !ok
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(38)} ${kib(bytes).toFixed(1).padStart(6)} KiB / ${budget} KiB`)
}
if (failed) {
  console.error('\nSize budget exceeded. Reduce the bundle, or change the budget deliberately (see the plan).')
  process.exit(1)
}
