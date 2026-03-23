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
- **Screenshot** — if `screenshot_url` or `screenshot_urls` is present, download each image to `/tmp/` and use Read to display it inline
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

## 4. Check Recently Resolved

Before presenting the summary, check if any issues were recently resolved:

- **Feedback**: Query with `resolved_at=not.is.null&order=resolved_at.desc&limit=5` to show recently resolved items. Display them in a separate "Recently Resolved" section so the user can see what's been handled.
- **Sentry**: The unresolved query (§3) already filters these out, but note the total count vs unresolved count if available.

## 5. Root Cause Analysis

Before presenting the summary, look across all open issues for patterns. This is the most valuable part of triage — individual bugs are cheap to fix, but recurring classes of bugs are expensive to ignore.

For each cluster of related issues (or for notable individual ones), ask:

- **Is this an architectural issue?** Does the bug point to a design gap — a missing validation layer, an API that's too easy to misuse, a component doing too many things? Name it if so.
- **Does this point to deeper issues?** If multiple feedback items or Sentry errors share a root cause (same component, same data flow, same user journey), call that out. Three "small" bugs from the same source are one medium-sized design problem.
- **Would an AI agent repeat this mistake?** If the bug was likely introduced by an AI agent working in an independent session (e.g., it missed a convention, duplicated logic, or didn't check for an existing utility), flag it. The fix might include updating `.AGENTS.md` or `CLAUDE.md` to prevent the same class of mistake in future sessions.

Include this analysis in the summary. It's fine to say "no patterns found" if there genuinely aren't any.

## 6. Present Summary

Show a combined numbered list of all open items across both sources, followed by the root cause analysis from §5. Ask the user what they'd like to do:

- **Fix** — start working on a specific issue
- **Mark resolved** — mark feedback or Sentry issues as fixed
- **Skip** — move on

## 7. Working on Issues

When the user chooses to **Fix** an issue, create a task list (via `TaskCreate`) that includes as the final item: **"Mark as resolved"** — referencing the specific feedback ID or Sentry issue ID. This ensures resolution tracking doesn't get forgotten during implementation.

## 8. Mark Feedback as Resolved

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

## 9. Mark Sentry Issues as Resolved

Use the Sentry API to update the issue status:

```
PUT https://sentry.io/api/0/projects/{org}/{project}/issues/{issue_id}/
{ "status": "resolved" }
```

## 10. Mark Fixed Items as Resolved

After code fixes are committed for specific feedback or Sentry items, **immediately mark them as resolved** — do not wait for the user to ask:

- PATCH each fixed feedback item with `resolved_at` (see §5)
- PUT each fixed Sentry issue to `resolved` (see §6). Note: the single-issue endpoint may 404 — use the **bulk update** endpoint instead:

```
PUT https://sentry.io/api/0/projects/{org}/{project}/issues/?id={id1}&id={id2}
{ "status": "resolved" }
```

Do not end the session without confirming every worked-on item has been marked resolved in both the database and Sentry.
