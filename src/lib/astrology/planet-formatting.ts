/**
 * Format planet names for display
 *
 * Special handling for various celestial points:
 * - Lunar nodes: True/Mean North/South Lunar Node → display with (T) or (M)
 * - Lilith: Mean/True Lilith → display with (M) or (T)
 * - Arabic Parts: Pars_Fortunae → Part of Fortune, etc.
 * - Other points: Anti_Vertex → Anti-Vertex, etc.
 *
 * @param apiName - The API name of the planet/point (e.g., "True_North_Lunar_Node")
 * @returns Formatted display name
 */
export function formatPlanetName(apiName: string): string {
  // Special handling for lunar nodes
  if (apiName === 'True_North_Lunar_Node' || apiName === 'True North Lunar Node') {
    return 'North Node (T)'
  }
  if (apiName === 'True_South_Lunar_Node' || apiName === 'True South Lunar Node') {
    return 'South Node (T)'
  }
  if (apiName === 'Mean_North_Lunar_Node' || apiName === 'Mean North Lunar Node') {
    return 'North Node (M)'
  }
  if (apiName === 'Mean_South_Lunar_Node' || apiName === 'Mean South Lunar Node') {
    return 'South Node (M)'
  }

  // Special handling for Lilith
  if (apiName === 'Mean_Lilith' || apiName === 'Mean Lilith') {
    return 'Lilith (M)'
  }
  if (apiName === 'True_Lilith' || apiName === 'True Lilith') {
    return 'Lilith (T)'
  }

  // Special handling for Arabic Parts (Pars)
  if (apiName === 'Pars_Fortunae' || apiName === 'Pars Fortunae') {
    return 'Part of Fortune'
  }
  if (apiName === 'Pars_Spiritus' || apiName === 'Pars Spiritus') {
    return 'Part of Spirit'
  }
  if (apiName === 'Pars_Amoris' || apiName === 'Pars Amoris') {
    return 'Part of Love'
  }
  if (apiName === 'Pars_Fidei' || apiName === 'Pars Fidei') {
    return 'Part of Faith'
  }

  // Special handling for chart angles
  if (apiName === 'Medium_Coeli' || apiName === 'Medium Coeli') {
    return 'Midheaven (MC)'
  }
  if (apiName === 'Imum_Coeli' || apiName === 'Imum Coeli') {
    return 'Imum Coeli (IC)'
  }
  if (apiName === 'Anti_Vertex' || apiName === 'Anti Vertex') {
    return 'Anti-Vertex'
  }

  // Default: replace underscores with spaces and capitalize
  return apiName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format planet names as short abbreviations for mobile display
 *
 * @param apiName - The API name of the planet/point
 * @returns Short abbreviated name (2-3 chars)
 */
export function formatPlanetNameShort(apiName: string): string {
  const name = apiName.toLowerCase().replace(/_/g, ' ')

  // Core planets
  if (name === 'sun') return 'Su'
  if (name === 'moon') return 'Mo'
  if (name === 'mercury') return 'Me'
  if (name === 'venus') return 'Ve'
  if (name === 'mars') return 'Ma'
  if (name === 'jupiter') return 'Ju'
  if (name === 'saturn') return 'Sa'
  if (name === 'uranus') return 'Ur'
  if (name === 'neptune') return 'Ne'
  if (name === 'pluto') return 'Pl'

  // Nodes
  if (name.includes('north')) return 'NN'
  if (name.includes('south')) return 'SN'

  // Lilith
  if (name.includes('lilith')) return 'Li'

  // Chiron and asteroids
  if (name === 'chiron') return 'Ch'
  if (name === 'ceres') return 'Ce'
  if (name === 'pallas') return 'Pa'
  if (name === 'juno') return 'Jn'
  if (name === 'vesta') return 'Vs'
  if (name === 'pholus') return 'Ph'

  // Angles
  if (name === 'ascendant') return 'Asc'
  if (name === 'medium coeli') return 'MC'
  if (name === 'descendant') return 'Dsc'
  if (name === 'imum coeli') return 'IC'
  if (name === 'vertex') return 'Vx'
  if (name === 'anti vertex') return 'AVx'

  // Parts
  if (name.includes('pars') || name.includes('part')) {
    if (name.includes('fortun')) return 'PoF'
    if (name.includes('spirit')) return 'PoS'
    if (name.includes('amor') || name.includes('love')) return 'PoL'
    if (name.includes('faith') || name.includes('fide')) return 'PoFa'
  }

  // Dwarf planets
  if (name === 'eris') return 'Er'
  if (name === 'sedna') return 'Se'
  if (name === 'haumea') return 'Ha'
  if (name === 'makemake') return 'Mk'
  if (name === 'ixion') return 'Ix'
  if (name === 'orcus') return 'Or'
  if (name === 'quaoar') return 'Qu'

  // Fixed stars
  if (name === 'regulus') return 'Reg'
  if (name === 'spica') return 'Spi'

  // Earth
  if (name === 'earth') return 'Ea'

  // Fallback: first 2-3 chars
  return apiName.substring(0, 2).replace(/_/g, '')
}
