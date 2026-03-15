"use client";

import { useEffect, useState, useCallback } from "react";

function formatDate(date: string | Date, showTime?: boolean): string {
  const d = new Date(date);
  return showTime ? d.toLocaleString() : d.toLocaleDateString();
}

/**
 * Renders a locale-formatted date string only on the client
 * to avoid SSR/client hydration mismatches caused by timezone differences.
 *
 * During SSR and initial hydration the component renders an empty string,
 * then updates after mount via useEffect.
 */
export function ClientDate({
  date,
  showTime,
  className,
}: {
  date: string | Date;
  /** Use toLocaleString (date + time) instead of toLocaleDateString */
  showTime?: boolean;
  className?: string;
}) {
  const formatter = useCallback(
    (d: string | Date) => formatDate(d, showTime),
    [showTime],
  );
  const [text, setText] = useState("");

  useEffect(() => {
    setText(formatter(date));
  }, [date, formatter]);

  if (!text) return null;

  return className ? <span className={className}>{text}</span> : <>{text}</>;
}
