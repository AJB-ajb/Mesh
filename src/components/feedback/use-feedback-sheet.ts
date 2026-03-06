"use client";

import { useSyncExternalStore, useCallback } from "react";

let open = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return open;
}

function setOpen(value: boolean) {
  open = value;
  listeners.forEach((l) => l());
}

export function useFeedbackSheet() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toggle = useCallback((value: boolean) => setOpen(value), []);
  return { open: isOpen, setOpen: toggle };
}

export function openFeedbackSheet() {
  setOpen(true);
}
