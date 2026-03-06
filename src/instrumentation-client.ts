import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    beforeSend(event) {
      const frames = event.exception?.values;
      if (frames?.length) {
        const { type, value } = frames[0];
        // Supabase Auth navigator.locks abort on mobile page navigation
        if (type === "AbortError") return null;
        // Transient mobile network failures (fetch itself throws)
        if (type === "TypeError" && value === "Failed to fetch") return null;
      }
      return event;
    },
  });
}

// Required by Sentry to instrument client-side navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
