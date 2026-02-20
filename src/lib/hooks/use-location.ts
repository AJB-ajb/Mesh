"use client";

import { useState, useCallback } from "react";
import { reverseGeocode, type GeocodingResult } from "@/lib/geocoding";
import type { ProfileFormState } from "@/lib/types/profile";
import { LOCATION } from "@/lib/constants";

export function useLocation(
  setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>,
  setSuccess: (success: boolean) => void,
) {
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const handleUseCurrentLocation = useCallback(async () => {
    setIsGeolocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      setIsGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const result = await reverseGeocode(lat, lng);

          setForm((prev) => ({
            ...prev,
            location: result.displayName,
            locationLat: lat.toString(),
            locationLng: lng.toString(),
          }));

          setShowAutocomplete(false);
          setSuccess(false);
        } catch (err) {
          setGeoError("Failed to get address from coordinates");
          console.error("Reverse geocoding error:", err);
        } finally {
          setIsGeolocating(false);
        }
      },
      (error) => {
        let errorMessage = "Failed to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location permission denied. Please use search or manual entry.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information unavailable. Please try search instead.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        setGeoError(errorMessage);
        setIsGeolocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION.GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  }, [setForm, setSuccess]);

  const handleLocationSelect = useCallback(
    (result: GeocodingResult) => {
      setForm((prev) => ({
        ...prev,
        location: result.displayName,
        locationLat: result.lat.toString(),
        locationLng: result.lng.toString(),
      }));
      setShowAutocomplete(false);
      setSuccess(false);
    },
    [setForm, setSuccess],
  );

  const handleLocationInputChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, location: value }));
      setSuccess(false);
    },
    [setForm, setSuccess],
  );

  return {
    isGeolocating,
    geoError,
    showAutocomplete,
    setShowAutocomplete,
    handleUseCurrentLocation,
    handleLocationSelect,
    handleLocationInputChange,
  };
}
