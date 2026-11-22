#!/usr/bin/env node
// Contract checks: i18n parity, token structure, contrast guard, generated artifact freshness.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const tokens = read('contracts/tokens/tokens.json')
const en = read('contracts/i18n/en.json')
const ta = read('contracts/i18n/ta.json')
const errors = []

const enKeys = Object.keys(en).sort()
const taKeys = Object.keys(ta).sort()
if (JSON.stringify(enKeys) !== JSON.stringify(taKeys)) {
  errors.push(`i18n key mismatch: en-only=${enKeys.filter((k) => !taKeys.includes(k))}, ta-only=${taKeys.filter((k) => !enKeys.includes(k))}`)
}
for (const key of enKeys) {
  if (typeof en[key] !== 'string' || en[key].trim() === '') errors.push(`Empty English string: ${key}`)
  if (typeof ta[key] !== 'string' || ta[key].trim() === '') errors.push(`Empty Tamil string: ${key}`)
}

const luminance = (hex) => {
  const channel = (start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
const pairs = [
  ['text', 'background', 4.5],
  ['text', 'surface', 4.5],
  ['text', 'surfaceAlt', 4.5],
  ['text', 'panel', 4.5],
  ['text', 'widgetBackground', 4.5],
  ['muted', 'surface', 4.5],
  ['onPrimary', 'primary', 4.5],
  ['onGrowth', 'growth', 4.5],
  ['onHighlight', 'highlight', 4.5],
]

for (const [presetId, preset] of Object.entries(tokens.colors.presets)) {
  for (const mode of ['light', 'dark']) {
    const map = preset[mode]
    for (const [foreground, background, minimum] of pairs) {
      const ratio = contrast(map[foreground], map[background])
      if (ratio < minimum) {
        errors.push(`Contrast ${presetId}.${mode} ${foreground}/${background}: ${ratio.toFixed(2)} < ${minimum}`)
      }
    }
    map.chart.forEach((color, index) => {
      const ratio = contrast(color, map.surface)
      if (ratio < 2) errors.push(`Chart ${presetId}.${mode}[${index}] has ${ratio.toFixed(2)} contrast on surface`)
    })
  }
}

try {
  execFileSync(process.execPath, [resolve(root, 'scripts/generate-tokens.mjs'), '--check'], { stdio: 'pipe' })
} catch {
  errors.push('Generated token artifacts are stale')
}

if (errors.length) {
  console.error(`Contract validation failed (${errors.length}):`)
  errors.forEach((error) => console.error(`  - ${error}`))
  process.exit(1)
}
console.log(`Contracts valid: ${enKeys.length} strings x2 locales, ${Object.keys(tokens.colors.presets).length} presets x2 modes, generated artifacts current.`)
