'use server'

import { fetchCitySuggestions, fetchGeoNamesLocation, fetchTimezoneFromGeoNames } from '@/lib/geo/geonames'
import type { GeoNamesCitySuggestion } from '@/lib/geo/geonames'
import { logger } from '@/lib/logging/server'

export type GeoNamesCitySuggestionFn = typeof fetchCitySuggestions
export type GeoNamesLocationFn = typeof fetchGeoNamesLocation
export type GeoNamesTimezoneFn = typeof fetchTimezoneFromGeoNames

/**
 * Server Action: Search cities via GeoNames
 * Proxies the request to the server-side GeoNames library to protect credentials.
 */
export async function searchCitiesAction(city: string, nation?: string | null): Promise<GeoNamesCitySuggestion[]> {
  try {
    return await fetchCitySuggestions(city, nation)
  } catch (error) {
    logger.error('Error searching cities:', error)
    throw new Error('Failed to search cities')
  }
}

/**
 * Server Action: Get location details (coords + timezone) via GeoNames
 * Proxies the request to the server-side GeoNames library.
 */
export async function getLocationDetailsAction(
  city?: string | null,
  nation?: string | null,
): Promise<{ latitude: number; longitude: number; timezone: string }> {
  try {
    return await fetchGeoNamesLocation({ city, nation })
  } catch (error) {
    logger.error('Error fetching location details:', error)
    throw new Error('Failed to fetch location details')
  }
}

/**
 * Server Action: Get timezone from coordinates via GeoNames
 * Proxies the request to the server-side GeoNames library.
 */
export async function getTimezoneAction(latitude: number, longitude: number): Promise<string> {
  try {
    return await fetchTimezoneFromGeoNames({ latitude, longitude })
  } catch (error) {
    logger.error('Error fetching timezone:', error)
    throw new Error('Failed to fetch timezone')
  }
}
