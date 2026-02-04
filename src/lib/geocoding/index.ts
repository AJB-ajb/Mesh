/**
 * Geocoding utilities - Public API
 * 
 * Provides abstraction layer for geocoding operations.
 * Currently uses Nominatim, but can be swapped for other providers.
 */

export { searchLocations, reverseGeocode } from './nominatim';
export type { GeocodingResult, GeolocationError } from './types';
