"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, MapPin, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  searchLocations,
  reverseGeocode,
  type GeocodingResult,
} from "@/lib/geocoding";
import { LOCATION } from "@/lib/constants";

interface LocationAutocompleteProps {
  value: string;
  onSelect: (result: GeocodingResult) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({
  value,
  onSelect,
  onChange,
  placeholder = "Search for a location...",
  disabled = false,
}: LocationAutocompleteProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [isGeolocating, setIsGeolocating] = useState(false);
  const supportsGeolocation =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await searchLocations(query, 5);
      setResults(searchResults);
      setShowDropdown(searchResults.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Use device GPS
  const handleUseCurrentLocation = useCallback(() => {
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          );
          onSelect(result);
          onChange(result.displayName);
          setShowDropdown(false);
        } catch {
          toast.error(
            "Could not determine your address. Try searching instead.",
          );
        } finally {
          setIsGeolocating(false);
        }
      },
      (error) => {
        setIsGeolocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            "Location permission denied. Please allow it in your browser settings.",
          );
        } else {
          toast.error("Could not get your location. Try searching instead.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION.GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  }, [onSelect, onChange]);

  // Handle input change with debouncing
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search by 300ms to respect rate limits
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newValue);
    }, 300);
  };

  // Handle result selection
  const handleSelect = (result: GeocodingResult) => {
    onSelect(result);
    setShowDropdown(false);
    setResults([]);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Use current location */}
      {supportsGeolocation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isGeolocating || disabled}
          onClick={handleUseCurrentLocation}
          className="mt-1 h-auto gap-1.5 px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {isGeolocating ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <LocateFixed className="size-3" />
          )}
          {isGeolocating ? "Locating..." : "Use my location"}
        </Button>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1" role="listbox">
            {results.map((result, index) => (
              <button
                key={`${result.lat}-${result.lng}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(result)}
                className={`flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 overflow-hidden">
                  <div className="truncate font-medium">
                    {result.displayName}
                  </div>
                  {result.address && (
                    <div className="truncate text-xs text-muted-foreground">
                      {[
                        result.address.city,
                        result.address.state,
                        result.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
