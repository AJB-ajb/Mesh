# Supabase Dashboard Setup

## Project Settings

**Dashboard:** Settings > General

- Project name / region are set at creation and cannot be changed.

**Dashboard:** Settings > API

| Key                | Env Var                                | Notes                                                   |
| ------------------ | -------------------------------------- | ------------------------------------------------------- |
| Project URL        | `NEXT_PUBLIC_SUPABASE_URL`             | `https://<ref>.supabase.co`                             |
| `anon` public key  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe to expose client-side                              |
| `service_role` key | `SUPABASE_SECRET_KEY`                  | **Server-only.** Bypasses RLS. Never expose to browser. |

## Authentication

### Providers (Authentication > Providers)

Three OAuth providers configured — credentials are entered **in the Supabase dashboard**, not in app code:

| Provider | Supabase Toggle          | Where to Get Credentials                            |
| -------- | ------------------------ | --------------------------------------------------- |
| Google   | Enable "Google"          | Google Cloud Console (see `setup-google-cloud.md`)  |
| GitHub   | Enable "GitHub"          | GitHub > Settings > Developer settings > OAuth Apps |
| LinkedIn | Enable "LinkedIn (OIDC)" | LinkedIn Developer Portal > My Apps                 |

For each provider, Supabase shows a **callback URL** — copy it and paste it as the redirect URI in the provider's developer console. Format: `https://<ref>.supabase.co/auth/v1/callback`

### Email / Password (Authentication > Providers > Email)

- Email auth is enabled. Confirmation emails require SMTP (see below).
- "Confirm email" toggle: when OFF, users are auto-confirmed on signup. When ON, they must click a link first.

### URL Configuration (Authentication > URL Configuration)

| Setting       | Value                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Site URL      | `http://localhost:3000` (dev) or `https://mesh-it.vercel.app` (prod)                                          |
| Redirect URLs | Add: `http://localhost:3000/callback`, `https://mesh-it.vercel.app/callback`, `https://*.vercel.app/callback` |

### SMTP (Authentication > SMTP Settings)

Not configured yet (GitHub issue #37). Supabase uses its built-in mailer which is rate-limited to ~4 emails/hour. For production, configure a real SMTP provider (e.g., Resend SMTP, AWS SES).

### Email Templates (Authentication > Email Templates)

Default Supabase templates are in use. Customise here if needed (confirmation, password reset, magic link).

## Database

### Extensions (Database > Extensions)

These must be enabled before migrations will work:

| Extension           | Purpose                                | Notes                                         |
| ------------------- | -------------------------------------- | --------------------------------------------- |
| `vector` (pgvector) | Embedding storage / similarity search  | May need manual enable on new projects        |
| `pg_net`            | HTTP requests from SQL (calendar cron) | Enable before running calendar cron migration |
| `pg_cron`           | Scheduled jobs                         | Enabled by default on Supabase                |

### Replication (Database > Replication)

The `supabase_realtime` publication must include these tables (added by migrations, but verify):
`messages`, `notifications`, `conversations`, `applications`

### Cron Jobs (after deployment)

Calendar background sync requires a manually scheduled pg_cron job. After deploying, run in the SQL Editor:

```sql
SELECT cron.schedule(
  'calendar-sync-all',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mesh-it.vercel.app/api/calendar/sync-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.calendar_sync_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Or replace the URL/secret directly. The `CALENDAR_SYNC_CRON_SECRET` env var in the app must match.

## Unintuitive Points

1. **Two separate Google OAuth setups.** Supabase auth uses Google credentials configured _in the Supabase dashboard_. Calendar sync uses _separate_ credentials configured as `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env vars in the app. They can be the same OAuth client, but the redirect URIs differ.

2. **`anon` key vs `service_role` key.** Both are JWTs. The `anon` key respects RLS policies — it's the one used in browsers. The `service_role` key **bypasses all RLS** and should only be used server-side. Leaking it exposes your entire database.

3. **Migrations vs Dashboard.** RLS policies, functions, and table schemas are managed via migrations in `supabase/migrations/`. But extensions, SMTP, auth providers, and cron jobs must be configured in the dashboard (or via `supabase db execute` for SQL-level settings).

4. **Realtime requires publication.** Adding a table to the database doesn't automatically make it available for realtime subscriptions. It must be added to the `supabase_realtime` publication (our migrations do this, but if you recreate tables, you need to re-add them).

5. **`pg_cron` + `pg_net` for background jobs.** Supabase doesn't natively support background workers. The workaround is pg_cron scheduling an HTTP request (via pg_net) to your own API endpoint. This means the cron job hits your Vercel deployment over the public internet.

6. **Rate-limited built-in emails.** Without SMTP configured, Supabase sends ~4 emails/hour total (not per user). This silently drops emails with no error — auth functions succeed but the user never receives the email.
