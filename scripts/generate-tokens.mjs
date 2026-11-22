#!/usr/bin/env node
// Generates platform token artifacts from contracts/tokens/tokens.json.
// Usage: node scripts/generate-tokens.mjs [--check]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')
const tokens = JSON.parse(readFileSync(resolve(root, 'contracts/tokens/tokens.json'), 'utf8'))
const { presets, roles, primitives, moduleAccents, stateRoles } = tokens.colors
const { families, preferenceSets, scale, lineHeight, weights } = tokens.typography

const HEX = /^#[0-9A-Fa-f]{6}$/
for (const [presetId, preset] of Object.entries(presets)) {
  for (const mode of ['light', 'dark']) {
    for (const role of roles) {
      const value = preset[mode][role]
      if (!HEX.test(value)) throw new Error(`Invalid ${presetId}.${mode}.${role}: ${value}`)
    }
    preset[mode].chart.forEach((value, index) => {
      if (!HEX.test(value)) throw new Error(`Invalid ${presetId}.${mode}.chart[${index}]: ${value}`)
    })
  }
}

const lines = []
const add = (text = '') => lines.push(text)

add('/* Generated from contracts/tokens/tokens.json by scripts/generate-tokens.mjs. Do not edit. */')
add(':root {')
for (const [name, value] of Object.entries(primitives)) add(`  --mf-color-${name}: ${value};`)
for (const role of roles) add(`  --mf-${role}: ${presets.vintageLibrary.light[role]};`)
for (let i = 0; i < 6; i += 1) add(`  --mf-chart-${i + 1}: ${presets.vintageLibrary.light.chart[i]};`)
for (const [name, value] of Object.entries(scale)) add(`  --mf-fs-${name}: ${value}px;`)
for (const [name, value] of Object.entries(lineHeight)) add(`  --mf-lh-${name}: ${value};`)
for (const [name, value] of Object.entries(weights)) add(`  --mf-weight-${name}: ${value};`)
add('  --mf-tracking-eyebrow: 0.18em;')
add(`  --mf-space-unit: ${tokens.spacing.unit}px;`)
for (const [name, value] of Object.entries(tokens.radii)) add(`  --mf-radius-${name}: ${value}px;`)
for (const [name, value] of Object.entries(tokens.elevation)) add(`  --mf-elevation-${name}: ${value};`)
for (const [name, value] of Object.entries(tokens.motion)) add(`  --mf-motion-${name}: ${value}ms;`)
for (const [role, value] of Object.entries(families)) add(`  --mf-font-${role}: ${value.map((f) => `'${f}'`).join(', ')}, serif;`)
add('}')
add()

for (const [presetId, preset] of Object.entries(presets)) {
  for (const mode of ['light', 'dark']) {
    add(`[data-preset="${presetId}"][data-mode="${mode}"] {`)
    for (const role of roles) add(`  --mf-${role}: ${preset[mode][role]};`)
    for (let i = 0; i < 6; i += 1) add(`  --mf-chart-${i + 1}: ${preset[mode].chart[i]};`)
    add('}')
    add()
  }
}

for (const [module, role] of Object.entries(moduleAccents)) {
  add(`[data-module="${module}"] { --mf-module-accent: var(--mf-${role}); }`)
}
add()

for (const [state, role] of Object.entries(stateRoles)) {
  add(`[data-state="${state}"] { --mf-interaction-color: var(--mf-${role}); }`)
}
add()

for (const [name, family] of Object.entries(families)) {
  add(`[data-fonts="vintage"] { --mf-active-font-${name}: var(--mf-font-${name}); }`)
}
for (const preferenceId of ['reading', 'clear']) {
  add(`[data-fonts="${preferenceId}"] {`)
  for (const [role, key] of Object.entries(preferenceSets[preferenceId])) {
    if (role === 'labelKey') continue
    add(`  --mf-active-font-${role}: var(--mf-font-${key});`)
  }
  add('}')
  add()
}

add('/* Typography preferences are applied as multipliers on :root. */')
add(':root { --mf-font-scale: 1; --mf-heading-scale: 1; --mf-body-line-height: var(--mf-lh-normal); }')
add(':root[data-size="small"] { --mf-font-scale: 0.9; }')
add(':root[data-size="large"] { --mf-font-scale: 1.15; }')
add(':root[data-heading="compact"] { --mf-heading-scale: 0.9; }')
add(':root[data-heading="large"] { --mf-heading-scale: 1.15; }')
add(':root[data-spacing="compact"] { --mf-body-line-height: var(--mf-lh-compact); }')
add(':root[data-spacing="relaxed"] { --mf-body-line-height: var(--mf-lh-relaxed); }')
add()
const css = `${lines.join('\n')}\n`

const presetIds = Object.keys(presets)
const ts = `/* Generated from contracts/tokens/tokens.json by scripts/generate-tokens.mjs. Do not edit. */
export const TOKEN_VERSION = ${JSON.stringify(tokens.version)}
export const presetIds = ${JSON.stringify(presetIds)} as const
export type PresetId = (typeof presetIds)[number]
export const presetLabelKeys: Record<PresetId, string> = ${JSON.stringify(
  Object.fromEntries(presetIds.map((id) => [id, presets[id].labelKey])),
)}
export const customPresets: PresetId[] = ${JSON.stringify(presetIds.filter((id) => presets[id].custom === true))}
export const isCustomPreset = (id: PresetId): boolean => customPresets.includes(id)
export const moduleAccents: Record<string, string> = ${JSON.stringify(moduleAccents)}
export const stateRoles: Record<string, string> = ${JSON.stringify(stateRoles)}
export const primitiveColors: Record<string, string> = ${JSON.stringify(primitives)}
export const fontPreferenceIds = ${JSON.stringify(Object.keys(preferenceSets))} as const
export type FontPreference = (typeof fontPreferenceIds)[number]
export const fontPreferenceLabelKeys: Record<FontPreference, string> = ${JSON.stringify(
  Object.fromEntries(Object.entries(preferenceSets).map(([id, value]) => [id, value.labelKey])),
)}
export const chartPalettes: Record<PresetId, Record<'light' | 'dark', string[]>> = ${JSON.stringify(
  Object.fromEntries(presetIds.map((id) => [id, { light: presets[id].light.chart, dark: presets[id].dark.chart }])),
)}
export const typographyScale = ${JSON.stringify(scale)}
export const typographyFamilies: Record<string, string[]> = ${JSON.stringify(families)}
export const themeRoles = ${JSON.stringify(roles)} as const
export type ThemeRole = (typeof themeRoles)[number]
`

const kotlinRoles = presetIds
  .map((id) => {
    const map = ['light', 'dark']
      .map((mode) => `      "${mode}" to mapOf(${roles.map((r) => `"${r}" to "${presets[id][mode][r]}"`).join(', ')})`)
      .join(',\n')
    return `    "${id}" to mapOf(\n${map}\n    )`
  })
  .join(',\n')
const kotlinPrimitiveColors = Object.entries(primitives)
  .map(([name, value]) => `"${name}" to "${value}"`)
  .join(', ')
const kotlinStateRoles = Object.entries(stateRoles)
  .map(([name, role]) => `"${name}" to "${role}"`)
  .join(', ')
const kotlinChartPalettes = presetIds
  .map((id) =>
    `    "${id}" to mapOf("light" to listOf(${presets[id].light.chart.map((c) => `"${c}"`).join(', ')}), "dark" to listOf(${presets[id].dark.chart.map((c) => `"${c}"`).join(', ')}))`,
  )
  .join(',\n')
const kotlinFontPreferences = Object.entries(preferenceSets)
  .map(([id, set]) =>
    `    "${id}" to mapOf(${Object.entries(set).filter(([role]) => role !== 'labelKey').map(([role, key]) => `"${role}" to "${key}"`).join(', ')})`,
  )
  .join(',\n')
const kotlin = `// Generated from contracts/tokens/tokens.json by scripts/generate-tokens.mjs. Do not edit.
package com.myflow.app.ui.theme

object GeneratedTokens {
    const val VERSION = "${tokens.version}"
    val roles: List<String> = listOf(${roles.map((r) => `"${r}"`).join(', ')})
    val presetIds: List<String> = listOf(${presetIds.map((id) => `"${id}"`).join(', ')})
    val colors: Map<String, Map<String, Map<String, String>>> = mapOf(
${kotlinRoles}
    )
    val primitiveColors: Map<String, String> = mapOf(${kotlinPrimitiveColors})
    val moduleAccents: Map<String, String> = mapOf(${Object.entries(moduleAccents).map(([m, r]) => `"${m}" to "${r}"`).join(', ')})
    val stateRoles: Map<String, String> = mapOf(${kotlinStateRoles})
    val chartPalettes: Map<String, Map<String, List<String>>> = mapOf(
${kotlinChartPalettes}
    )
    val fontPreferenceIds: List<String> = listOf(${Object.keys(preferenceSets).map((id) => `"${id}"`).join(', ')})
    val fontPreferences: Map<String, Map<String, String>> = mapOf(
${kotlinFontPreferences}
    )
    val fontFamilies: Map<String, List<String>> = mapOf(${Object.entries(families).map(([name, list]) => `"${name}" to listOf(${list.map((f) => `"${f}"`).join(', ')})`).join(', ')})
    val fontSizeScale: Map<String, Int> = mapOf(${Object.entries(scale).map(([k, v]) => `"${k}" to ${v}`).join(', ')})
    val lineHeight: Map<String, Double> = mapOf(${Object.entries(lineHeight).map(([k, v]) => `"${k}" to ${v}`).join(', ')})
    val weights: Map<String, Int> = mapOf(${Object.entries(weights).map(([k, v]) => `"${k}" to ${v}`).join(', ')})
    val radii: Map<String, Int> = mapOf(${Object.entries(tokens.radii).map(([k, v]) => `"${k}" to ${v}`).join(', ')})
    val motion: Map<String, Int> = mapOf(${Object.entries(tokens.motion).map(([k, v]) => `"${k}" to ${v}`).join(', ')})
}
`

const outputs = [
  [resolve(root, 'apps/web/src/generated/tokens.css'), css],
  [resolve(root, 'apps/web/src/generated/tokens.ts'), ts],
  [resolve(root, 'apps/android/app/src/main/java/com/myflow/app/ui/theme/GeneratedTokens.kt'), kotlin],
]

let stale = false
for (const [path, content] of outputs) {
  let current = ''
  try {
    current = readFileSync(path, 'utf8')
  } catch {
    current = ''
  }
  if (current === content) continue
  stale = true
  if (!checkOnly) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}
if (checkOnly && stale) {
  console.error('Token artifacts are stale. Run: node scripts/generate-tokens.mjs')
  process.exit(1)
}
console.log(`${checkOnly ? 'Verified' : 'Generated'} ${outputs.length} token artifacts (version ${tokens.version}).`)
