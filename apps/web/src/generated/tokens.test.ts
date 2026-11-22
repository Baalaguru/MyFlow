import { describe, expect, it } from 'vitest'
import {
  chartPalettes,
  fontPreferenceIds,
  presetIds,
  presetLabelKeys,
  themeRoles,
} from './tokens'

describe('generated token contract', () => {
  it('exposes all six presets with translated label keys', () => {
    expect(presetIds).toHaveLength(6)
    for (const id of presetIds) {
      expect(presetLabelKeys[id]).toBeTruthy()
    }
  })

  it('exposes six chart colours for every preset and mode', () => {
    for (const id of presetIds) {
      expect(chartPalettes[id].light).toHaveLength(6)
      expect(chartPalettes[id].dark).toHaveLength(6)
    }
  })

  it('includes the semantic roles used by the UI', () => {
    for (const role of ['background', 'surface', 'primary', 'text', 'focus', 'widgetBackground']) {
      expect(themeRoles).toContain(role)
    }
  })

  it('includes all three font preference sets', () => {
    expect(fontPreferenceIds).toEqual(['vintage', 'reading', 'clear'])
  })
})
