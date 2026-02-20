# Google Cloud Console Setup

**Console:** https://console.cloud.google.com

## Project

Create (or select) a Google Cloud project. All APIs and credentials live under this project.

## APIs to Enable

**Console:** APIs & Services > Library

| API                 | Purpose                            | Required For          |
| ------------------- | ---------------------------------- | --------------------- |
| Google Calendar API | FreeBusy queries for calendar sync | Calendar sync feature |

No other Google APIs are required. (Google Sign-In for Supabase auth does not require enabling an API — it works via Google's OAuth endpoints directly.)

## OAuth Consent Screen

**Console:** APIs & Services > OAuth consent screen

| Setting       | Value                                               |
| ------------- | --------------------------------------------------- |
| User Type     | External                                            |
| App name      | Mesh (or your app name)                             |
| Support email | Your email                                          |
| Scopes        | `https://www.googleapis.com/auth/calendar.freebusy` |
| Test users    | Add your Gmail addresses while in "Testing" status  |

### Publishing Status

- **Testing**: Only users explicitly added as "test users" can authorize. Google shows a scary "unverified app" warning. Fine for development.
- **In production**: Any Google user can authorize. Requires Google's verification review if using sensitive scopes. `calendar.freebusy` is **not** classified as sensitive, so verification should be straightforward.

## OAuth Credentials

**Console:** APIs & Services > Credentials > Create Credentials > OAuth Client ID

| Setting          | Value                      |
| ---------------- | -------------------------- |
| Application type | Web application            |
| Name             | Mesh (or descriptive name) |

### Authorized Redirect URIs

Add **all** of these:

| URI                                                         | Purpose                                    |
| ----------------------------------------------------------- | ------------------------------------------ |
| `https://<ref>.supabase.co/auth/v1/callback`                | Supabase Google Sign-In                    |
| `http://localhost:3000/api/calendar/google/callback`        | Calendar sync (local dev)                  |
| `https://mesh-it.vercel.app/api/calendar/google/callback`   | Calendar sync (production)                 |
| `https://<preview>.vercel.app/api/calendar/google/callback` | Calendar sync (Vercel previews, if needed) |

After creating, you get:

| Key           | Env Var                | Used By                                          |
| ------------- | ---------------------- | ------------------------------------------------ |
| Client ID     | `GOOGLE_CLIENT_ID`     | Calendar sync (app env var) + Supabase dashboard |
| Client Secret | `GOOGLE_CLIENT_SECRET` | Calendar sync (app env var) + Supabase dashboard |

You can use the **same** OAuth client for both Supabase auth and calendar sync — just add all redirect URIs. Or create two separate clients if you want isolation.

## Env Vars Summary

```
GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

Also enter these same credentials in the **Supabase dashboard** under Authentication > Providers > Google (see `setup-supabase.md`).

## Unintuitive Points

1. **Two redirect URIs, one OAuth client.** Supabase auth redirects to `supabase.co/auth/v1/callback`. Calendar sync redirects to `your-app.com/api/calendar/google/callback`. Both must be listed as authorized redirect URIs on the same OAuth client, or you'll get `redirect_uri_mismatch` errors.

2. **"Testing" mode blocks real users.** While the consent screen is in Testing status, only email addresses you manually add under "Test users" can authorize. Other users get a hard block (not just a warning). There's no error message on your end — the user just can't proceed at Google's consent screen.

3. **Refresh tokens require `prompt: "consent"`.** Google only returns a `refresh_token` on the _first_ authorization, or when you explicitly set `prompt: "consent"`. Our code does this. If you ever remove it, re-authorizing an already-connected user will silently return no refresh token, and background sync will break when the access token expires (~1 hour).

4. **`calendar.freebusy` is read-only.** This scope only allows querying free/busy status — it cannot read event titles, descriptions, attendees, or any other calendar data. This is the minimum-privilege scope for availability checking.

5. **Redirect URI must match exactly.** Google compares redirect URIs character-by-character, including trailing slashes and protocol. `http://localhost:3000/api/calendar/google/callback` and `http://localhost:3000/api/calendar/google/callback/` are different URIs and the latter will fail.

6. **API enablement is per-project.** If you switch Google Cloud projects, you need to re-enable the Calendar API in the new project. The OAuth client ID is also project-scoped.
