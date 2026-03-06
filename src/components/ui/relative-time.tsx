"use client";

import { useEffect, useState } from "react";

type Formatter = (date: string | Date) => string;

/**
 * Renders a relative-time string (e.g. "3 days ago") only on the client
 * to avoid SSR/client hydration mismatches caused by `new Date()` drift.
 *
 * During SSR and initial hydration the component renders an empty string,
 * then updates after mount via useEffect.
 */
export function RelativeTime({
  date,
  formatter,
  className,
}: {
  date: string | Date;
  formatter: Formatter;
  className?: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(formatter(date));
  }, [date, formatter]);

  if (!text) return null;

  return className ? <span className={className}>{text}</span> : <>{text}</>;
}
