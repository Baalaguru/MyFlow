import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  isHexColour,
  isReadablePair,
  readableForeground,
  relativeLuminance,
  validateCustomColour,
} from './appearance'

describe('contrast guard', () => {
  it('knows that black is darker than white', () => {
    expect(relativeLuminance('#000000')).toBeLessThan(relativeLuminance('#FFFFFF'))
  })

  it('is symmetric and returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1)
  })

  it('accepts the documented leather and parchment pairing', () => {
    expect(isReadablePair('#FBF5E9', '#70563B')).toBe(true)
  })

  it('rejects a low-contrast pairing', () => {
    expect(isReadablePair('#E4D7C1', '#EFE4D0')).toBe(false)
  })

  it('picks a readable foreground for dark and light accents', () => {
    expect(readableForeground('#241E1A')).toBe('#FBF5E9')
    expect(readableForeground('#F3EBDD')).toBe('#241E1A')
  })

  it('accepts valid hex colours only', () => {
    expect(isHexColour('#70563B')).toBe(true)
    expect(isHexColour('70563B')).toBe(false)
    expect(isHexColour('#12345')).toBe(false)
  })

  it('rejects a custom colour that no foreground can make readable', () => {
    expect(validateCustomColour('primary', '#777777')).toBe('contrastWarning')
    expect(validateCustomColour('primary', '#70563B')).toBeNull()
    expect(validateCustomColour('primary', 'not-a-colour')).toBe('invalidColor')
  })
})
