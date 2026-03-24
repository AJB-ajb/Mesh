"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseAutoSaveOptions = {
  /** Async save function to call */
  saveFn: () => Promise<void>;
  /** Debounce delay in ms (default 1500) */
  delay?: number;
};

/**
 * Debounced auto-save hook.
 *
 * Returns a `triggerSave` callback that debounces calls to the provided
 * `saveFn`. The status cycles through idle → saving → saved → idle.
 * Flushes on unmount if a save is pending.
 */
export function useAutoSave({ saveFn, delay = 1500 }: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const isMountedRef = useRef(true);

  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const doSave = useCallback(async () => {
    if (isMountedRef.current) setSaveStatus("saving");
    try {
      await saveFnRef.current();
      if (isMountedRef.current) {
        setSaveStatus("saved");
        setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, 2000);
      }
    } catch {
      if (isMountedRef.current) setSaveStatus("error");
    }
  }, []);

  const triggerSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      doSave();
    }, delay);
  }, [delay, doSave]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // Fire-and-forget flush — isMountedRef is already false so status won't update
        saveFnRef.current().catch(() => {});
      }
    };
  }, []);

  return { saveStatus, triggerSave };
}
