/**
 * Geocoding types for location services
 */

export interface GeocodingResult {
    displayName: string;
    lat: number;
    lng: number;
    address?: {
        city?: string;
        country?: string;
        state?: string;
    };
}

export interface NominatimResult {
    display_name: string;
    lat: string;
    lon: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        country?: string;
        state?: string;
    };
}

export interface GeolocationError {
    code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
    message: string;
}
