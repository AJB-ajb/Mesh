"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface NumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const ITEM_HEIGHT = 32;
const VISIBLE_ITEMS = 3;
const SCROLL_DEBOUNCE = 100;

function DesktopPicker({
  value,
  onChange,
  min = 1,
  max = 10,
  label,
  disabled,
  className,
}: NumberPickerProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <input
      data-slot="number-picker"
      type="text"
      inputMode="numeric"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      role="spinbutton"
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return;
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(clamp(n));
      }}
      onWheel={(e) => {
        e.preventDefault();
        onChange(clamp(value + (e.deltaY < 0 ? 1 : -1)));
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(clamp(value + 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(clamp(value - 1));
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(min);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(max);
        }
      }}
      className={cn(
        "border-input h-9 w-16 rounded-md border bg-transparent px-3 py-1 text-center text-sm shadow-xs transition-[color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

function MobilePicker({
  value,
  onChange,
  min = 1,
  max = 10,
  label,
  disabled,
  className,
}: NumberPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Sync scroll position when value changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = value - min;
    const target = idx * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 2) {
      setIsSyncing(true);
      el.scrollTo({ top: target, behavior: "smooth" });
      // Clear syncing flag after scroll settles
      const t = setTimeout(() => setIsSyncing(false), 200);
      return () => clearTimeout(t);
    }
  }, [value, min]);

  const handleScroll = useCallback(() => {
    if (isSyncing) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const newVal = min + Math.max(0, Math.min(idx, items.length - 1));
      if (newVal !== value) onChange(newVal);
    }, SCROLL_DEBOUNCE);
  }, [min, items.length, value, onChange, isSyncing]);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Initial scroll position (no animation)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = (value - min) * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div
      data-slot="number-picker"
      role="spinbutton"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(clamp(value + 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(clamp(value - 1));
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(min);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(max);
        }
      }}
      className={cn(
        "border-input relative w-16 rounded-md border shadow-xs",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchMove={(e) => e.stopPropagation()}
        className="overflow-y-auto scrollbar-hide"
        style={{
          height: VISIBLE_ITEMS * ITEM_HEIGHT,
          scrollSnapType: "y mandatory",
          touchAction: "pan-y",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 33%, black 67%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 33%, black 67%, transparent 100%)",
        }}
      >
        {/* Top spacer so first item can center */}
        <div style={{ height: ITEM_HEIGHT }} />
        {items.map((n) => (
          <div
            key={n}
            onClick={() => {
              if (!disabled) onChange(n);
            }}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
            className={cn(
              "flex items-center justify-center select-none transition-colors",
              n === value
                ? "text-foreground text-sm font-medium"
                : "text-muted-foreground text-xs opacity-50 cursor-pointer",
            )}
          >
            {n}
          </div>
        ))}
        {/* Bottom spacer so last item can center */}
        <div style={{ height: ITEM_HEIGHT }} />
      </div>
    </div>
  );
}

export function NumberPicker(props: NumberPickerProps) {
  const { min = 1, max = 10, value, onChange } = props;

  // Clamp value when max decreases below current value
  useEffect(() => {
    if (value > max) onChange(max);
    else if (value < min) onChange(min);
  }, [value, min, max, onChange]);

  return (
    <>
      {/* Desktop: md and up */}
      <div className="hidden md:block">
        <DesktopPicker {...props} />
      </div>
      {/* Mobile: below md */}
      <div className="md:hidden">
        <MobilePicker {...props} />
      </div>
    </>
  );
}
