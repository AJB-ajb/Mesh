---
name: triage
description: Pull open issues from the dev database (user feedback with screenshots) and Sentry, review them, and mark resolved ones as fixed. Use when the user says 'triage', 'check feedback', 'review issues', 'what bugs are open', 'check Sentry', or 'pull issues'.
argument-hint: "[source] (feedback | sentry | all — defaults to all)"
---

# Triage Issues

Retrieve open issues from user feedback and/or Sentry, display them for review, and optionally mark them as resolved.

## 1. Determine Scope

If `$ARGUMENTS` contains "feedback", "sentry", or "all", use that. Default to **all**.

## 2. Pull User Feedback

Query the `feedback` table via the Supabase REST API using the service-role key from `.env`:

```
GET /rest/v1/feedback?select=*&order=created_at.desc&resolved_at=is.null
Authorization: Bearer $SUPABASE_SECRET_KEY
apikey: $SUPABASE_SECRET_KEY
```

URL base: `$NEXT_PUBLIC_SUPABASE_URL`

For each entry, display:

- **Date** and **page URL**
- **Message** (the user's feedback text)
- **Mood** (if set)
- **Screenshot** — if `screenshot_url` is present, download the image to `/tmp/` and use Read to display it inline
- **Device context** from `metadata` (screen size, platform, dark mode, connection)

Group and number the entries for easy reference.

## 3. Pull Sentry Issues

Use the Sentry API to fetch recent unresolved issues:

```
GET https://sentry.io/api/0/projects/{org}/{project}/issues/?query=is:unresolved&sort=date&limit=15
Authorization: Bearer $SENTRY_AUTH_TOKEN
```

Use `SENTRY_ORG` and `SENTRY_PROJECT` from `.env`.

For each issue, display:

- **Title** and **culprit** (file/function)
- **Count** and **user count**
- **First seen / last seen**
- **Level** (error, warning, etc.)
- **Short link**

## 4. Present Summary

Show a combined numbered list of all open items across both sources. Ask the user what they'd like to do:

- **Fix** — start working on a specific issue
- **Mark resolved** — mark feedback or Sentry issues as fixed
- **Skip** — move on

## 5. Mark Feedback as Resolved

When the user marks a feedback item as resolved, PATCH it via the REST API:

```
PATCH /rest/v1/feedback?id=eq.<id>
{ "resolved_at": "<now ISO>" }
```

The `resolved_at` column must exist. If the column doesn't exist yet, create a migration:

```sql
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
```

Save it to `supabase/migrations/` with the standard timestamp naming convention and apply it with `supabase db push` if on the dev database.

## 6. Mark Sentry Issues as Resolved

Use the Sentry API to update the issue status:

```
PUT https://sentry.io/api/0/projects/{org}/{project}/issues/{issue_id}/
{ "status": "resolved" }
```

## 7. Mark Fixed Items as Resolved

After code fixes are committed for specific feedback or Sentry items, **immediately mark them as resolved** — do not wait for the user to ask:

- PATCH each fixed feedback item with `resolved_at` (see §5)
- PUT each fixed Sentry issue to `resolved` (see §6). Note: the single-issue endpoint may 404 — use the **bulk update** endpoint instead:

```
PUT https://sentry.io/api/0/projects/{org}/{project}/issues/?id={id1}&id={id2}
{ "status": "resolved" }
```

Do not end the session without confirming every worked-on item has been marked resolved in both the database and Sentry.
