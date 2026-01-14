/**
 * GeoNames API integration for geocoding and timezone lookup
 *
 * Note: GEONAMES_USERNAME should be set as a server-side environment variable
 * Do NOT use NEXT_PUBLIC_ prefix to avoid exposing credentials in client bundle
 */
import { logger } from '@/lib/logging/server'

const GEONAMES_BASE_URL = 'https://secure.geonames.org'

// Server-side only - not exposed to client
function getGeoNamesUsername(): string {
  // Check for server-side env var first (preferred)
  const username = process.env.GEONAMES_USERNAME
  logger.debug('[GeoNames] Username set:', username)

  if (!username) {
    throw new Error('GeoNames username not configured. Set GEONAMES_USERNAME environment variable.')
  }

  return username
}

type GeoLookupOptions = {
  city?: string | null
  nation?: string | null
  signal?: AbortSignal
}

type Coordinates = {
  latitude: number
  longitude: number
}

export type GeoNamesCitySuggestion = {
  name: string
  adminName?: string
  countryCode?: string
  countryName?: string
  latitude: number
  longitude: number
}

export async function fetchCoordinatesFromGeoNames({ city, nation, signal }: GeoLookupOptions): Promise<Coordinates> {
  const username = getGeoNamesUsername()

  const query = [city?.trim(), nation?.trim()].filter(Boolean).join(', ')
  if (!query) {
    throw new Error('City is required to search coordinates')
  }

  const params = new URLSearchParams({
    q: query,
    maxRows: '1',
    username,
    featureClass: 'P', // populated places
    type: 'json',
  })

  const response = await fetch(`${GEONAMES_BASE_URL}/searchJSON?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error(`GeoNames search failed: ${response.status}`)
  }

  const data = await response.json()
  const first = data?.geonames?.[0]

  if (!first) {
    throw new Error('No matching location found')
  }

  const latitude = Number(first.lat)
  const longitude = Number(first.lng)

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error('GeoNames returned invalid coordinates')
  }

  return { latitude, longitude }
}

export async function fetchTimezoneFromGeoNames({
  latitude,
  longitude,
  signal,
}: Coordinates & { signal?: AbortSignal }): Promise<string> {
  const username = getGeoNamesUsername()

  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    username,
  })

  const response = await fetch(`${GEONAMES_BASE_URL}/timezoneJSON?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error(`GeoNames timezone lookup failed: ${response.status}`)
  }

  const data = await response.json()
  const timezone = data?.timezoneId || data?.timezone || data?.tzId

  if (!timezone || typeof timezone !== 'string') {
    throw new Error('No timezone found for these coordinates')
  }

  return timezone
}

export async function fetchGeoNamesLocation(options: GeoLookupOptions): Promise<Coordinates & { timezone: string }> {
  const coords = await fetchCoordinatesFromGeoNames(options)
  const timezone = await fetchTimezoneFromGeoNames({
    ...coords,
    signal: options.signal,
  })

  return { ...coords, timezone }
}

interface GeoNamesSearchResult {
  name: string
  adminName1?: string
  countryCode?: string
  countryName?: string
  lat: string
  lng: string
}

export async function fetchCitySuggestions(
  city: string,
  nation?: string | null,
  signal?: AbortSignal,
): Promise<GeoNamesCitySuggestion[]> {
  const username = getGeoNamesUsername()

  const trimmed = city.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    q: trimmed,
    maxRows: '6',
    username,
    featureClass: 'P',
    type: 'json',
  })
  if (nation) params.set('country', nation)

  const response = await fetch(`${GEONAMES_BASE_URL}/searchJSON?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error(`GeoNames city lookup failed: ${response.status}`)
  }

  const data = await response.json()
  const list = Array.isArray(data?.geonames) ? data.geonames : []

  return list
    .map((item: GeoNamesSearchResult) => {
      const latitude = Number(item.lat)
      const longitude = Number(item.lng)
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null
      return {
        name: item.name,
        adminName: item.adminName1,
        countryCode: item.countryCode,
        countryName: item.countryName,
        latitude,
        longitude,
      } satisfies GeoNamesCitySuggestion
    })
    .filter(Boolean) as GeoNamesCitySuggestion[]
}
