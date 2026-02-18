/**
 * Unit Tests for Chart Highlights Utilities
 *
 * Tests the chart highlights functions for extracting and formatting
 * key astrological data for the Chart Highlights component.
 *
 * @module src/lib/astrology/chart-highlights
 */
import { describe, it, expect } from 'vitest'
import * as chartHighlights from '@/lib/astrology/chart-highlights'
import {
  scoreAspect,
  findBestAspect,
  findSynastryKeyAspect,
  getRelevantAspects,
  formatPosition,
  formatSignDegree,
  formatAspect,
  normalizeChartType,
  getEffectiveSubject,
  getAscendantRuler,
  getSignRuler,
} from '@/lib/astrology/chart-highlights'
import type { Aspect, Point, ChartData, EnrichedSubjectModel } from '@/types/astrology'

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Creates a mock Aspect object with defaults
 */
function createMockAspect(overrides: Partial<Aspect> = {}): Aspect {
  return {
    p1_name: 'Sun',
    p2_name: 'Moon',
    aspect: 'conjunction',
    orbit: 0,
    aspect_degrees: 0,
    diff: 0,
    p1: 0,
    p2: 1,
    ...overrides,
  }
}

/**
 * Creates a mock Point object with defaults
 */
function createMockPoint(overrides: Partial<Point> = {}): Point {
  return {
    name: 'Sun',
    quality: 'Fixed',
    element: 'Fire',
    sign: 'Leo',
    sign_num: 5,
    position: 15.5,
    abs_pos: 135.5,
    emoji: '',
    point_type: 'Planet',
    house: 'First_House',
    retrograde: false,
    ...overrides,
  }
}

/**
 * Creates mock ChartData with aspects
 */
function createMockChartData(overrides: Partial<ChartData> = {}): ChartData {
  return {
    subject: {} as ChartData['subject'],
    aspects: [],
    synastry_aspects: [],
    transit_aspects: [],
    ...overrides,
  } as ChartData
}

// ============================================================================
// scoreAspect Tests
// ============================================================================

describe('scoreAspect', () => {
  /**
   * Tests for the aspect scoring function that calculates
   * astrological significance based on classical principles.
   */

  it('should score Sun higher than Saturn aspects', () => {
    // Sun is a luminary (highest priority), Saturn is a social planet
    const sunAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Mercury',
      aspect: 'conjunction',
      orbit: 2,
    })

    const saturnAspect = createMockAspect({
      p1_name: 'Saturn',
      p2_name: 'Mercury',
      aspect: 'conjunction',
      orbit: 2,
    })

    expect(scoreAspect(sunAspect)).toBeGreaterThan(scoreAspect(saturnAspect))
  })

  it('should score Conjunction higher than Sextile', () => {
    // Major aspects: conjunction has higher priority than sextile
    const conjunctionAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'conjunction',
      orbit: 2,
    })

    const sextileAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'sextile',
      orbit: 2,
    })

    expect(scoreAspect(conjunctionAspect)).toBeGreaterThan(scoreAspect(sextileAspect))
  })

  it('should score tight orb higher than wide orb', () => {
    // Tighter orbs indicate stronger manifestation
    const tightOrbAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'trine',
      orbit: 0.5,
    })

    const wideOrbAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'trine',
      orbit: 8,
    })

    expect(scoreAspect(tightOrbAspect)).toBeGreaterThan(scoreAspect(wideOrbAspect))
  })

  it('should apply penalty for Lunar Node aspects', () => {
    // Lunar nodes are deprioritized
    const sunMoonAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'conjunction',
      orbit: 1,
    })

    const sunNodeAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'True_North_Lunar_Node',
      aspect: 'conjunction',
      orbit: 1,
    })

    expect(scoreAspect(sunMoonAspect)).toBeGreaterThan(scoreAspect(sunNodeAspect))
  })

  it('should apply penalty for slow-planet-to-slow-planet aspects', () => {
    // Jupiter-Saturn aspects are generational, not individual
    const personalAspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Venus',
      aspect: 'trine',
      orbit: 2,
    })

    const generationalAspect = createMockAspect({
      p1_name: 'Jupiter',
      p2_name: 'Saturn',
      aspect: 'trine',
      orbit: 2,
    })

    expect(scoreAspect(personalAspect)).toBeGreaterThan(scoreAspect(generationalAspect))
  })

  it('should handle unknown planets with default priority', () => {
    const unknownAspect = createMockAspect({
      p1_name: 'UnknownPlanet',
      p2_name: 'AnotherUnknown',
      aspect: 'conjunction',
      orbit: 1,
    })

    // Should not throw and return a valid score
    expect(() => scoreAspect(unknownAspect)).not.toThrow()
    expect(scoreAspect(unknownAspect)).toBeGreaterThan(0)
  })
})

// ============================================================================
// findBestAspect Tests
// ============================================================================

describe('findBestAspect', () => {
  /**
   * Tests for finding the most significant aspect from a list.
   */

  it('should return the highest scored aspect', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Saturn', p2_name: 'Uranus', aspect: 'sextile', orbit: 5 }),
      createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'conjunction', orbit: 1 }),
      createMockAspect({ p1_name: 'Mercury', p2_name: 'Venus', aspect: 'square', orbit: 3 }),
    ]

    const best = findBestAspect(aspects)

    // Sun-Moon conjunction should have highest score
    expect(best?.p1_name).toBe('Sun')
    expect(best?.p2_name).toBe('Moon')
  })

  it('should apply filterFn to narrow candidates', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'conjunction', orbit: 1 }),
      createMockAspect({ p1_name: 'Mars', p2_name: 'Venus', aspect: 'opposition', orbit: 2 }),
      createMockAspect({ p1_name: 'Mercury', p2_name: 'Saturn', aspect: 'trine', orbit: 1 }),
    ]

    // Filter to only Mars aspects
    const best = findBestAspect(aspects, (a) => a.p1_name === 'Mars' || a.p2_name === 'Mars')

    expect(best?.p1_name).toBe('Mars')
  })

  it('should respect maxOrb parameter', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'conjunction', orbit: 8 }),
      createMockAspect({ p1_name: 'Mercury', p2_name: 'Venus', aspect: 'sextile', orbit: 2 }),
    ]

    // With maxOrb of 5, Sun-Moon conjunction (orbit 8) should be excluded
    const best = findBestAspect(aspects, undefined, true, 5)

    expect(best?.p1_name).toBe('Mercury')
    expect(best?.p2_name).toBe('Venus')
  })

  it('should return undefined for empty array', () => {
    const best = findBestAspect([])

    expect(best).toBeUndefined()
  })

  it('should use simple orb sorting when useScoring is false', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Jupiter', p2_name: 'Saturn', aspect: 'conjunction', orbit: 0.5 }),
      createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'trine', orbit: 3 }),
    ]

    // With scoring disabled, tightest orb wins regardless of planet importance
    const best = findBestAspect(aspects, undefined, false)

    expect(best?.p1_name).toBe('Jupiter')
    expect(best?.orbit).toBe(0.5)
  })

  it('should fall back to all aspects when filter returns empty', () => {
    const aspects = [createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'conjunction', orbit: 1 })]

    // Filter that matches nothing, but useScoring=true allows fallback
    const best = findBestAspect(aspects, (a) => a.p1_name === 'NonExistent', true)

    expect(best?.p1_name).toBe('Sun')
  })
})

// ============================================================================
// findSynastryKeyAspect Tests
// ============================================================================

describe('findSynastryKeyAspect', () => {
  /**
   * Tests for synastry-specific aspect prioritization.
   */

  it('should prioritize Ascendant-Ascendant aspect', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'conjunction', orbit: 1 }),
      createMockAspect({ p1_name: 'Ascendant', p2_name: 'Ascendant', aspect: 'trine', orbit: 3 }),
    ]

    const key = findSynastryKeyAspect(aspects)

    expect(key?.p1_name).toBe('Ascendant')
    expect(key?.p2_name).toBe('Ascendant')
  })

  it('should prioritize Sun-Sun or Sun-Moon when no Asc-Asc', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Mars', p2_name: 'Venus', aspect: 'conjunction', orbit: 0.5 }),
      createMockAspect({ p1_name: 'Sun', p2_name: 'Moon', aspect: 'trine', orbit: 2 }),
    ]

    const key = findSynastryKeyAspect(aspects)

    expect(key?.p1_name).toBe('Sun')
    expect(key?.p2_name).toBe('Moon')
  })

  it('should fall back to scored aspect when no priority matches', () => {
    const aspects = [
      createMockAspect({ p1_name: 'Mars', p2_name: 'Venus', aspect: 'conjunction', orbit: 1 }),
      createMockAspect({ p1_name: 'Mercury', p2_name: 'Jupiter', aspect: 'sextile', orbit: 2 }),
    ]

    const key = findSynastryKeyAspect(aspects)

    // Should return the highest scored aspect
    expect(key).toBeDefined()
  })

  it('should return undefined for empty array', () => {
    const key = findSynastryKeyAspect([])

    expect(key).toBeUndefined()
  })
})

// ============================================================================
// getRelevantAspects Tests
// ============================================================================

describe('getRelevantAspects', () => {
  /**
   * Tests for getting the appropriate aspects array based on chart type.
   */

  it('should return aspects for natal chart', () => {
    const natalAspects = [createMockAspect({ p1_name: 'Sun', p2_name: 'Moon' })]
    const data = createMockChartData({ aspects: natalAspects })

    const result = getRelevantAspects('natal', data)

    expect(result).toEqual(natalAspects)
  })

  it('should return aspects for synastry chart', () => {
    const synastryAspects = [createMockAspect({ p1_name: 'Sun', p2_name: 'Venus' })]
    const data = createMockChartData({ aspects: synastryAspects })

    const result = getRelevantAspects('synastry', data)

    expect(result).toEqual(synastryAspects)
  })

  it('should return secondary aspects for transit chart when available', () => {
    const primaryAspects = [createMockAspect({ p1_name: 'Sun', p2_name: 'Moon' })]
    const transitAspects = [createMockAspect({ p1_name: 'Mars', p2_name: 'Saturn' })]

    const data = createMockChartData({ aspects: primaryAspects })
    const secondaryData = createMockChartData({ aspects: transitAspects })

    const result = getRelevantAspects('transit', data, secondaryData)

    expect(result).toEqual(transitAspects)
  })

  it('should return empty array when no aspects exist', () => {
    const data = createMockChartData({ aspects: undefined })

    const result = getRelevantAspects('natal', data)

    expect(result).toEqual([])
  })

  it('should handle solar return chart type', () => {
    const returnAspects = [createMockAspect({ p1_name: 'Sun', p2_name: 'Jupiter' })]
    const data = createMockChartData({ aspects: returnAspects })

    const result = getRelevantAspects('solar return', data)

    expect(result).toEqual(returnAspects)
  })

  it('should handle composite chart type', () => {
    const compositeAspects = [createMockAspect({ p1_name: 'Moon', p2_name: 'Venus' })]
    const data = createMockChartData({ aspects: compositeAspects })

    const result = getRelevantAspects('composite', data)

    expect(result).toEqual(compositeAspects)
  })
})

// ============================================================================
// formatPosition Tests
// ============================================================================

describe('formatPosition', () => {
  /**
   * Tests for formatting point positions.
   */

  it('should format position with sign, degree, minutes, and house', () => {
    const point = createMockPoint({
      sign: 'Leo',
      position: 15.5,
      house: 'First_House',
    })

    const result = formatPosition(point)

    expect(result).toBe("Leo 15°30' First House")
  })

  it('should format position without house when showHouse is false', () => {
    const point = createMockPoint({
      sign: 'Aries',
      position: 10.25,
      house: 'Tenth_House',
    })

    const result = formatPosition(point, false)

    expect(result).toBe("Aries 10°15'")
  })

  it('should return Unknown for undefined point', () => {
    const result = formatPosition(undefined)

    expect(result).toBe('Unknown')
  })

  it('should handle point without house', () => {
    const point = createMockPoint({
      sign: 'Cancer',
      position: 20.75,
      house: null,
    })

    const result = formatPosition(point)

    expect(result).toBe("Cancer 20°45'")
  })

  it('should handle zero position', () => {
    const point = createMockPoint({
      sign: 'Aries',
      position: 0,
      house: 'First_House',
    })

    const result = formatPosition(point)

    expect(result).toBe("Aries 0°0' First House")
  })
})

// ============================================================================
// getSignRuler Tests
// ============================================================================

describe('getSignRuler', () => {
  /**
   * Tests for zodiac sign rulership lookup.
   */

  it('should return Mars as classical ruler of Aries', () => {
    const ruler = getSignRuler('Aries', 'classical')

    expect(ruler).toBe('Mars')
  })

  it('should return Saturn as classical ruler of Aquarius', () => {
    const ruler = getSignRuler('Aquarius', 'classical')

    expect(ruler).toBe('Saturn')
  })

  it('should return Uranus as modern ruler of Aquarius', () => {
    const ruler = getSignRuler('Aquarius', 'modern')

    expect(ruler).toBe('Uranus')
  })

  it('should default to classical mode', () => {
    const ruler = getSignRuler('Aquarius')

    expect(ruler).toBe('Saturn')
  })

  it('should handle case-insensitive sign names', () => {
    expect(getSignRuler('aries')).toBe('Mars')
    expect(getSignRuler('ARIES')).toBe('Mars')
    expect(getSignRuler('ArIeS')).toBe('Mars')
  })

  it('should return undefined for invalid sign', () => {
    const ruler = getSignRuler('InvalidSign')

    expect(ruler).toBeUndefined()
  })

  it('should return undefined for undefined sign', () => {
    const ruler = getSignRuler(undefined)

    expect(ruler).toBeUndefined()
  })

  it('should handle Italian sign names', () => {
    expect(getSignRuler('Ariete')).toBe('Mars')
    expect(getSignRuler('Acquario', 'classical')).toBe('Saturn')
    expect(getSignRuler('Acquario', 'modern')).toBe('Uranus')
  })

  it('should handle abbreviated sign names', () => {
    expect(getSignRuler('Ari')).toBe('Mars')
    expect(getSignRuler('Aqu', 'classical')).toBe('Saturn')
    expect(getSignRuler('Aqu', 'modern')).toBe('Uranus')
  })

  it('should return correct modern rulers for outer planet signs', () => {
    expect(getSignRuler('Scorpio', 'modern')).toBe('Pluto')
    expect(getSignRuler('Pisces', 'modern')).toBe('Neptune')
    expect(getSignRuler('Aquarius', 'modern')).toBe('Uranus')
  })

  it('should return correct classical rulers for outer planet signs', () => {
    expect(getSignRuler('Scorpio', 'classical')).toBe('Mars')
    expect(getSignRuler('Pisces', 'classical')).toBe('Jupiter')
    expect(getSignRuler('Aquarius', 'classical')).toBe('Saturn')
  })
})

// ============================================================================
// formatSignDegree Tests
// ============================================================================

describe('formatSignDegree', () => {
  it('should format position with sign and degrees', () => {
    const point = createMockPoint({
      sign: 'Leo',
      position: 15.5,
    })

    const result = formatSignDegree(point)

    expect(result).toBe("Leo 15°30'")
  })

  it('should return Unknown for undefined point', () => {
    const result = formatSignDegree(undefined)

    expect(result).toBe('Unknown')
  })

  it('should handle missing sign', () => {
    const point = createMockPoint({
      sign: undefined,
      position: 10.25,
    })

    const result = formatSignDegree(point)

    expect(result).toBe("Unknown 10°15'")
  })

  it('should handle zero position', () => {
    const point = createMockPoint({
      sign: 'Aries',
      position: 0,
    })

    const result = formatSignDegree(point)

    expect(result).toBe("Aries 0°0'")
  })
})

// ============================================================================
// formatAspect Tests
// ============================================================================

describe('formatAspect', () => {
  it('should format aspect with planets, type, and orb', () => {
    const aspect = createMockAspect({
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'conjunction',
      orbit: 2.5,
    })

    const result = formatAspect(aspect)

    expect(result).toBe('Sun-Moon conjunction (2.5°)')
  })

  it('should return dash for undefined aspect', () => {
    const result = formatAspect(undefined)

    expect(result).toBe('—')
  })

  it('should handle negative orb', () => {
    const aspect = createMockAspect({
      p1_name: 'Mars',
      p2_name: 'Venus',
      aspect: 'opposition',
      orbit: -1.3,
    })

    const result = formatAspect(aspect)

    expect(result).toBe('Mars-Venus opposition (-1.3°)')
  })
})

// ============================================================================
// normalizeChartType Tests
// ============================================================================

describe('normalizeChartType', () => {
  it('should normalize natal chart types', () => {
    expect(normalizeChartType('natal')).toBe('natal')
    expect(normalizeChartType('Natal')).toBe('natal')
    expect(normalizeChartType('NATAL')).toBe('natal')
    expect(normalizeChartType('natal_chart')).toBe('natal')
  })

  it('should normalize transit chart types', () => {
    expect(normalizeChartType('transit')).toBe('transit')
    expect(normalizeChartType('Transit')).toBe('transit')
    expect(normalizeChartType('transit_chart')).toBe('transit')
  })

  it('should normalize synastry chart types', () => {
    expect(normalizeChartType('synastry')).toBe('synastry')
    expect(normalizeChartType('Synastry')).toBe('synastry')
  })

  it('should normalize composite chart types', () => {
    expect(normalizeChartType('composite')).toBe('composite')
    expect(normalizeChartType('Composite')).toBe('composite')
  })

  it('should normalize solar return chart types', () => {
    expect(normalizeChartType('solar return')).toBe('solar return')
    expect(normalizeChartType('Solar Return')).toBe('solar return')
    expect(normalizeChartType('solar_return')).toBe('solar return')
    expect(normalizeChartType('solar-return')).toBe('solar return')
  })

  it('should normalize lunar return chart types', () => {
    expect(normalizeChartType('lunar return')).toBe('lunar return')
    expect(normalizeChartType('Lunar Return')).toBe('lunar return')
    expect(normalizeChartType('lunar_return')).toBe('lunar return')
    expect(normalizeChartType('lunar-return')).toBe('lunar return')
  })

  it('should handle generic return as solar return', () => {
    expect(normalizeChartType('return')).toBe('solar return')
  })

  it('should return unknown for unrecognized types', () => {
    expect(normalizeChartType('invalid')).toBe('unknown')
    expect(normalizeChartType('')).toBe('unknown')
    expect(normalizeChartType('some_random_chart')).toBe('unknown')
  })
})

// ============================================================================
// getEffectiveSubject Tests
// ============================================================================

describe('getEffectiveSubject', () => {
  it('should return primary subject for natal chart', () => {
    const primarySubject = { name: 'John' } as EnrichedSubjectModel
    const data = createMockChartData({ subject: primarySubject })

    const result = getEffectiveSubject('natal', data)

    expect(result).toBe(primarySubject)
  })

  it('should return secondary subject for transit chart when available', () => {
    const primarySubject = { name: 'John' } as EnrichedSubjectModel
    const transitSubject = { name: 'Transit' } as EnrichedSubjectModel
    const data = createMockChartData({ subject: primarySubject })
    const secondaryData = createMockChartData({ subject: transitSubject })

    const result = getEffectiveSubject('transit', data, secondaryData)

    expect(result).toBe(transitSubject)
  })

  it('should return secondary subject for solar return when available', () => {
    const primarySubject = { name: 'John' } as EnrichedSubjectModel
    const returnSubject = { name: 'Solar Return' } as EnrichedSubjectModel
    const data = createMockChartData({ subject: primarySubject })
    const secondaryData = createMockChartData({ subject: returnSubject })

    const result = getEffectiveSubject('solar return', data, secondaryData)

    expect(result).toBe(returnSubject)
  })

  it('should return secondary subject for lunar return when available', () => {
    const primarySubject = { name: 'John' } as EnrichedSubjectModel
    const returnSubject = { name: 'Lunar Return' } as EnrichedSubjectModel
    const data = createMockChartData({ subject: primarySubject })
    const secondaryData = createMockChartData({ subject: returnSubject })

    const result = getEffectiveSubject('lunar return', data, secondaryData)

    expect(result).toBe(returnSubject)
  })

  it('should return primary subject for transit when no secondary data', () => {
    const primarySubject = { name: 'John' } as EnrichedSubjectModel
    const data = createMockChartData({ subject: primarySubject })

    const result = getEffectiveSubject('transit', data)

    expect(result).toBe(primarySubject)
  })

  it('should return primary subject for synastry', () => {
    const primarySubject = { name: 'John' } as EnrichedSubjectModel
    const secondarySubject = { name: 'Jane' } as EnrichedSubjectModel
    const data = createMockChartData({ subject: primarySubject })
    const secondaryData = createMockChartData({ subject: secondarySubject })

    const result = getEffectiveSubject('synastry', data, secondaryData)

    expect(result).toBe(primarySubject)
  })
})

// ============================================================================
// getAscendantRuler Tests
// ============================================================================

describe('getAscendantRuler', () => {
  function createMockSubject(overrides: Partial<EnrichedSubjectModel> = {}): EnrichedSubjectModel {
    return {
      name: 'Test',
      ascendant: createMockPoint({ name: 'Ascendant', sign: 'Aries' }),
      mars: createMockPoint({ name: 'Mars', sign: 'Leo' }),
      venus: createMockPoint({ name: 'Venus', sign: 'Taurus' }),
      pluto: createMockPoint({ name: 'Pluto', sign: 'Capricorn' }),
      uranus: createMockPoint({ name: 'Uranus', sign: 'Taurus' }),
      neptune: createMockPoint({ name: 'Neptune', sign: 'Pisces' }),
      ...overrides,
    } as EnrichedSubjectModel
  }

  it('should return Mars for Aries ascendant (classical)', () => {
    const subject = createMockSubject({
      ascendant: createMockPoint({ name: 'Ascendant', sign: 'Aries' }),
    })

    const ruler = getAscendantRuler(subject, 'classical')

    expect(ruler?.name).toBe('Mars')
  })

  it('should return Venus for Taurus ascendant', () => {
    const subject = createMockSubject({
      ascendant: createMockPoint({ name: 'Ascendant', sign: 'Taurus' }),
    })

    const ruler = getAscendantRuler(subject, 'classical')

    expect(ruler?.name).toBe('Venus')
  })

  it('should return Pluto for Scorpio ascendant (modern)', () => {
    const subject = createMockSubject({
      ascendant: createMockPoint({ name: 'Ascendant', sign: 'Scorpio' }),
    })

    const ruler = getAscendantRuler(subject, 'modern')

    expect(ruler?.name).toBe('Pluto')
  })

  it('should return undefined when ascendant has no sign', () => {
    const subject = createMockSubject({
      ascendant: createMockPoint({ name: 'Ascendant', sign: undefined }),
    })

    const ruler = getAscendantRuler(subject)

    expect(ruler).toBeUndefined()
  })

  it('should return undefined when ascendant is missing', () => {
    const subject = createMockSubject({
      ascendant: undefined,
    })

    const ruler = getAscendantRuler(subject)

    expect(ruler).toBeUndefined()
  })

  it('should default to classical mode', () => {
    const subject = createMockSubject({
      ascendant: createMockPoint({ name: 'Ascendant', sign: 'Aquarius' }),
      saturn: createMockPoint({ name: 'Saturn', sign: 'Capricorn' }),
    })

    const ruler = getAscendantRuler(subject)

    expect(ruler?.name).toBe('Saturn')
  })

  it('should return undefined when ruler planet is not in subject', () => {
    const subject = {
      name: 'Test',
      ascendant: createMockPoint({ name: 'Ascendant', sign: 'Aries' }),
      // mars is missing
    } as EnrichedSubjectModel

    const ruler = getAscendantRuler(subject)

    expect(ruler).toBeUndefined()
  })
})

// ============================================================================
// Removed unused constants Tests
// ============================================================================

describe('removed unused constants', () => {
  it('should not export MINOR_ASPECTS', () => {
    expect('MINOR_ASPECTS' in chartHighlights).toBe(false)
  })

  it('should not export TRADITIONAL_POINTS', () => {
    expect('TRADITIONAL_POINTS' in chartHighlights).toBe(false)
  })

  it('should still export MAJOR_ASPECTS', () => {
    expect(chartHighlights.MAJOR_ASPECTS).toBeDefined()
    expect(chartHighlights.MAJOR_ASPECTS).toContain('conjunction')
  })

  it('should still export PERSONAL_PLANETS', () => {
    expect(chartHighlights.PERSONAL_PLANETS).toBeDefined()
    expect(chartHighlights.PERSONAL_PLANETS).toContain('Sun')
  })
})
