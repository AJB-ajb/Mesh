# Mesh Architecture Review

You are performing a weekly automated architecture review of the Mesh codebase. Your goal is to surface concrete, actionable findings and file them as a GitHub issue.

## Step 1: Load Context

Before auditing any code, read these files in full to understand the system:

- `docs/architecture.md` — system overview, layers, and design decisions
- `docs/data-model.md` — database schema and relationships
- `.AGENTS.md` — development conventions, testing requirements, migration patterns
- `spec/roadmap.md` — current milestone (v0.3) and in-progress features

## Step 2: Audit the Codebase

Systematically audit each area below. For each finding, note the file path and line number where applicable.

### Area 1: Data Fetching Patterns (SWR)

Review `src/lib/hooks/` and all `useSWR` call sites:

- Are SWR cache keys consistent and namespaced to avoid collisions?
- Are mutations paired with correct `mutate()` calls to avoid stale UI?
- Are any hooks fetching data that should instead be server-side (RSC or API route)?
- Are there any hooks not following the `src/lib/hooks/` convention (e.g., inline `useSWR` in components)?
- Does any hook subscribe to Supabase realtime AND use SWR? (These should be separate — realtime stays in `useEffect`.)

### Area 2: Supabase Client Usage

Review `src/lib/supabase/` and all imports of `createClient`:

- Is the **browser client** (`src/lib/supabase/client.ts`) ever imported in API routes or server components? (It should not be — these must use the server client.)
- Is the **server client** ever used in browser-only contexts?
- Are there any RLS-bypassing patterns (service role key in client code, or queries that skip auth context)?
- Are `supabase.auth.getUser()` and `supabase.auth.getSession()` used correctly? (`getUser()` should be preferred for auth validation — `getSession()` alone is not trusted server-side.)
- Are there any N+1 query patterns (e.g., fetching a list then querying each item individually)?

### Area 3: API Route Patterns

Review all files under `src/app/api/`:

- Does every route handler pass through `withAuth` (from `src/lib/api/with-auth.ts`) or explicitly handle unauthenticated requests?
- Are error responses consistent in shape across routes?
- Is user-supplied input validated before use (especially IDs, string lengths, enum values)?
- Are any routes missing rate limiting that accept user-generated content or trigger expensive AI calls?
- Do AI-calling routes (embedding, normalization, extraction) have appropriate timeouts and error handling for provider failures?

### Area 4: TypeScript Strictness

Scan for type safety issues in `src/`:

- Use of `as any`, `as unknown as X`, or `@ts-ignore` / `@ts-expect-error` — are these justified?
- Unsafe casts in API handlers (e.g., casting `req.body` without validation)?
- Missing return types on exported functions in `src/lib/`?
- Any `!` non-null assertions on values that could realistically be null at runtime?

### Area 5: Test Coverage Gaps

Cross-reference `.AGENTS.md` test requirements against actual test files:

- List any API routes in `src/app/api/` that lack a corresponding test in `src/app/api/**/__tests__/`
- List any hooks in `src/lib/hooks/` without tests in `src/lib/hooks/__tests__/`
- List any utility modules in `src/lib/` without tests
- Note any recently added features (infer from file modification times or imports) that appear untested

### Area 6: Performance

Look for patterns that could cause performance issues at scale:

- Any Supabase queries fetching unbounded result sets (no `.limit()` or pagination)?
- Embedding or AI calls made synchronously in request handlers that could be deferred to background jobs?
- Any client components importing heavy libraries that should be lazy-loaded?
- Waterfall data fetches (sequential awaits) in routes or server components that could be parallelised with `Promise.all`?
- Missing or potentially stale indexes — cross-reference query patterns against `docs/data-model.md`

### Area 7: Security

Focus on auth edge cases and the AI pipeline:

- Are there any routes where an authenticated user could access or modify another user's data without ownership checks?
- Does the AI extraction pipeline (`/api/ai/`, `/api/skills/normalize`) accept arbitrary user-supplied text that is sent verbatim to LLM providers? Are prompt injection risks considered?
- Are there any SSRF risks (e.g., user-supplied URLs fetched server-side)?
- Is the `SUPABASE_SECRET_KEY` (service role) only used in server-side code and never exposed to the client bundle?
- Are there any endpoints that reveal internal error details or stack traces to the client?

### Area 8: Roadmap Alignment

Review `spec/roadmap.md` v0.3 milestone features against the current codebase:

- **Hard filter enforcement**: Is the two-stage matching pipeline (hard filters → soft scoring) partially implemented, or does all matching still go through the embedding similarity path?
- **Tree-aware skill filtering**: Is there any recursive CTE logic for skill hierarchy traversal, or is filtering still flat?
- **Per-skill matching scoring**: Does scoring use `posting_skills` join table data, or the deprecated `skill_level_min` column?
- **Drop old skill columns (contract phase)**: Are the old columns (`skills text[]`, `skill_levels jsonb`, `skill_level_min`) still referenced in any code paths that would block the migration?
- **Sequential invite UI (in progress)**: Are there any obvious gaps or edge cases in the `feat/sequential-invite-ui` implementation visible from the merged code?

## Step 3: Create a GitHub Issue

After completing the audit, create a GitHub issue with the following structure.

Use severity labels on each finding:

- 🔴 **Critical** — security vulnerability, data loss risk, or broken feature
- 🟡 **Warning** — correctness issue, missing coverage, or technical debt that will compound
- 🔵 **Suggestion** — improvement opportunity, performance optimization, or nice-to-have

Issue title: `arch-review: Weekly architecture review — {YYYY-MM-DD}`

Issue body structure:

```
## Summary

One-paragraph executive summary of the overall health of the codebase and the most important findings.

## Findings

### Data Fetching (SWR)
[findings or "No issues found"]

### Supabase Client Usage
[findings or "No issues found"]

### API Route Patterns
[findings or "No issues found"]

### TypeScript Strictness
[findings or "No issues found"]

### Test Coverage
[findings or "No issues found"]

### Performance
[findings or "No issues found"]

### Security
[findings or "No issues found"]

### Roadmap Alignment
[findings or "No issues found"]

## Action Items

Ordered list of the top 5 most important things to address, with the relevant file paths.

## Automated Review Metadata

- **Model**: claude-sonnet-4-6
- **Trigger**: scheduled / workflow_dispatch
- **Review date**: {ISO date}
```

Before creating the issue, ensure the `arch-review` label exists. If it does not, create it:

```bash
gh label create arch-review --color 0075ca --description "Automated architecture review findings" 2>/dev/null || true
```

Then create the issue:

```bash
gh issue create \
  --title "arch-review: Weekly architecture review — $(date +%Y-%m-%d)" \
  --label "arch-review" \
  --body "..."
```
