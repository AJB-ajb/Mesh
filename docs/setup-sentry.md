# Sentry Setup

**Dashboard:** https://sentry.io

## Project Creation

Create a **Next.js** project in Sentry. This gives you the DSN and configures the right platform settings.

**Dashboard:** Settings > Projects > [your project]

## Keys and Env Vars

**Dashboard:** Settings > Projects > [your project] > Client Keys (DSN)

| Key          | Env Var                  | Scope           | Notes                                                                          |
| ------------ | ------------------------ | --------------- | ------------------------------------------------------------------------------ |
| DSN          | `NEXT_PUBLIC_SENTRY_DSN` | Client + Server | `NEXT_PUBLIC_` prefix is intentional — needed for browser-side error reporting |
| Auth Token   | `SENTRY_AUTH_TOKEN`      | Build-time only | For source map uploads. Create at Settings > Account > Auth Tokens             |
| Org slug     | `SENTRY_ORG`             | Build-time only | Your organization slug from the URL                                            |
| Project slug | `SENTRY_PROJECT`         | Build-time only | Your project slug from the URL                                                 |

### Creating the Auth Token

**Dashboard:** Settings > Account > API > Auth Tokens > Create New Token

Required scope: `project:releases` (needed for source map uploads).

The token format is `sntrys_...`.

## App Configuration

Configuration files (already in the codebase, no changes needed):

| File                            | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `sentry.server.config.ts`       | Server-side Sentry init                                  |
| `sentry.edge.config.ts`         | Edge runtime Sentry init                                 |
| `src/instrumentation-client.ts` | Browser-side Sentry init (includes Session Replay)       |
| `src/instrumentation.ts`        | Next.js instrumentation hook — loads server/edge configs |
| `next.config.ts`                | Wraps Next.js config with `withSentryConfig()`           |

### Current Settings

| Setting                   | Value                                   | Where                       |
| ------------------------- | --------------------------------------- | --------------------------- |
| Traces sample rate        | 10%                                     | All config files            |
| Session Replay (on error) | 100%                                    | `instrumentation-client.ts` |
| Session Replay (normal)   | 0%                                      | `instrumentation-client.ts` |
| Tunnel route              | `/monitoring`                           | `next.config.ts`            |
| Source maps               | Enabled when `SENTRY_AUTH_TOKEN` is set | `next.config.ts`            |
| Environment               | `VERCEL_ENV` or `"development"`         | All config files            |

## Unintuitive Points

1. **DSN is `NEXT_PUBLIC_` on purpose.** Unlike most secrets, the Sentry DSN is designed to be public — it's embedded in client-side JavaScript. It only allows sending events to your project, not reading them. Don't treat it as a secret.

2. **`/monitoring` tunnel route.** The app proxies Sentry traffic through `/monitoring` to avoid ad-blockers that block `sentry.io` requests. This means Sentry events appear as first-party requests to your domain. No dashboard configuration needed — this is handled in `next.config.ts`.

3. **Source maps only upload during CI builds.** If `SENTRY_AUTH_TOKEN` is not set, source map upload is silently disabled (`sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN }`). Local dev builds won't upload source maps and that's fine.

4. **Auth token vs DSN.** The DSN is for _sending_ events (client + server, runtime). The auth token is for _uploading_ source maps (build-time only, CI). They serve completely different purposes and are obtained from different places in the dashboard.

5. **Environment is auto-detected.** Sentry environment is set from `VERCEL_ENV` (automatically set by Vercel to `production`, `preview`, or `development`). You don't need to configure this manually.
