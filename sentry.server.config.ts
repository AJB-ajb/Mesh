import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
    beforeSend(event) {
      const frames = event.exception?.values;
      if (frames?.length) {
        const { value } = frames[0];
        // Expected for expired sessions — not a bug
        if (value === "Not authenticated") return null;
        // Turbopack dev-mode artifact, not a real error
        if (value === "Script is not defined") return null;
      }
      return event;
    },
  });
}
