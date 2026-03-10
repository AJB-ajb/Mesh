---
name: release
description: "Release Mesh to production: run full test suite (unit + E2E), fix any failures, open a PR from dev to main, apply pending migrations to the production Supabase project, and tag a release. Use this skill whenever the user says 'release', 'deploy to production', 'cut a release', 'merge to main', 'ship it', 'push to prod', 'create a release PR', or wants to promote dev to main."
argument-hint: "[version-bump: patch|minor|major] (default: inferred from changes)"
---

# Release to Production

Promote `dev` to `main`, run the full test suite (fixing any failures), apply migrations to the production database, and tag a release.

## 1. Pre-flight Checks

Before anything else, verify the starting conditions.

1. **On `dev` branch** in the main repo (`/home/ajb/repos/Mesh`):

   ```
   git branch --show-current
   ```

   If not on `dev`, switch to it. If there are uncommitted changes, abort and tell the user to commit or stash first.

2. **Dev is up to date with remote**:

   ```
   git fetch origin
   git status -uno
   ```

   If `dev` is behind `origin/dev`, pull first. If ahead, push first (ask the user).

3. **Check what's new since last release** — find the diff between `main` and `dev`:

   ```
   git log main..dev --oneline
   ```

   If there are no commits, abort — nothing to release.

4. **Show the user a summary** of what will be released: commit count, migration count, and a brief list of notable changes. Ask for confirmation before proceeding.

## 2. Run the Full Test Suite

All tests must pass before opening the PR. Run them sequentially so failures are easy to diagnose.

### 2a. Type check

```
pnpm tsc --noEmit
```

### 2b. Lint

```
pnpm lint
```

### 2c. Unit tests

```
pnpm test:run
```

### 2d. Build

```
pnpm build
```

The build must succeed — it catches SSR issues, missing imports, and Suspense boundary problems that unit tests won't find.

### 2e. E2E tests

```
pnpm test:e2e
```

### 2f. pgTAP (RLS tests)

**Important**: The DB password contains `$` and `!` characters that bash interprets as variable/history expansion. You **must** invoke `supabase test db` via Python's `subprocess` to bypass shell mangling:

```python
python3 -c "
import subprocess, urllib.parse, os, dotenv
dotenv.load_dotenv()
pw = os.environ['SUPABASE_DB_PASSWORD']
encoded = urllib.parse.quote(pw, safe='')
url = f'postgresql://postgres:{encoded}@db.wcfpmyiaauclgugjrntu.supabase.co:5432/postgres'
r = subprocess.run(['supabase', 'test', 'db', '--db-url', url], capture_output=True, text=True, timeout=60)
print(r.stdout)
if r.stderr: print('STDERR:', r.stderr)
print('RC:', r.returncode)
"
```

If `dotenv` is not installed, read the password directly:

```python
python3 -c "
import subprocess, urllib.parse, re
with open('.env') as f:
    m = re.search(r'SUPABASE_DB_PASSWORD=\"(.+?)\"', f.read())
pw = m.group(1)
encoded = urllib.parse.quote(pw, safe='')
url = f'postgresql://postgres:{encoded}@db.wcfpmyiaauclgugjrntu.supabase.co:5432/postgres'
r = subprocess.run(['supabase', 'test', 'db', '--db-url', url], capture_output=True, text=True, timeout=60)
print(r.stdout)
if r.stderr: print('STDERR:', r.stderr)
print('RC:', r.returncode)
"
```

Ignore failures in tests with hardcoded row counts (e.g. `01_profiles_rls.sql` expecting 3 profiles) — these are known false positives against the remote dev DB. All RLS policy logic tests must pass.

### Handling failures

If any step fails:

1. Analyze the failure and determine the root cause.
2. Create a worktree (`git worktree add ../Mesh-fix/release-fixes -b fix/release-fixes dev`) and fix the issue there.
3. Land the fix back to `dev` using the `/land` skill.
4. Return to the main repo on `dev` and re-run the failing step from scratch.
5. Repeat until all steps pass. Don't skip or ignore failures.

The goal is a green test suite on `dev` before the PR is opened — the PR should represent tested, working code.

## 3. Check for Pending Migrations

Compare migration status between local and the **production** Supabase project.

1. **Save the currently linked project ref** so we can restore it later — use the Read tool to read `supabase/.temp/project-ref`.

2. **Link to production**:

   ```
   npx supabase link --project-ref jirgkhjdxahfsgqxprhh
   ```

3. **List migration status**:

   ```
   npx supabase migration list --linked
   ```

4. **Count pending migrations** — rows where the Remote column is empty. Store the count and the list of migration names for the summary.

5. **Re-link to dev** (restore the saved ref):
   ```
   npx supabase link --project-ref <saved-ref>
   ```

Do NOT push migrations yet — that happens after the PR is merged (step 6).

## 4. Version Bump

Determine the version bump from `$ARGUMENTS` or infer it:

- **major** — breaking changes or major milestones
- **minor** — new features (default if migrations or new features are present)
- **patch** — bug fixes only

1. Read the current version from `package.json`.
2. Compute the new version.
3. Show the user: `Bumping version: 0.5.0 -> 0.6.0 (minor)`. Ask for confirmation.
4. Update the `version` field in `package.json`.
5. Update `spec/2-roadmap.md` — set the "Current version" line to the new version and "Last updated" to today's date.
6. Commit the version bump on `dev`:
   ```
   git add package.json spec/roadmap.md
   git commit -m "chore: bump version to <new-version>"
   ```
7. Push `dev`:
   ```
   git push
   ```

## 5. Open the Release PR

Create a pull request from `dev` to `main`.

```bash
gh pr create --base main --head dev \
  --title "Release v<new-version>" \
  --body "$(cat <<'EOF'
## Release v<new-version>

### Changes since last release
<list of commits from step 1, grouped by type>

### Migrations
<count> pending migrations to apply to production after merge:
<list of migration names>

### Test results
- Type check: PASS
- Lint: PASS
- Unit tests: PASS (<count> tests)
- Build: PASS
- E2E tests: PASS (<count> tests)

### Post-merge checklist
- [ ] Merge this PR
- [ ] Apply migrations to production
- [ ] Verify production deployment on Vercel
- [ ] Tag the release

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Tell the user the PR URL and ask them to review and merge when ready.

## 6. Post-Merge: Apply Migrations to Production

After the user confirms the PR is merged:

1. **Pull main**:

   ```
   git checkout main
   git pull
   ```

2. **Switch back to dev** and fast-forward it:

   ```
   git checkout dev
   git pull
   ```

3. **Link to production**:

   ```
   npx supabase link --project-ref jirgkhjdxahfsgqxprhh
   ```

4. **Push migrations** (if any were pending):

   ```
   npx supabase db push
   ```

5. **Re-link to dev project**:

   ```
   npx supabase link --project-ref wcfpmyiaauclgugjrntu
   ```

6. **Verify** by listing migrations again — all should now show a Remote timestamp.

If `db push` fails, report the error immediately. The code is already deployed via Vercel — a migration failure means the production database is out of sync and needs urgent attention.

## 7. Tag the Release

Create a git tag and push it:

```
git tag -a v<new-version> -m "Release v<new-version>"
git push origin v<new-version>
```

## 8. Summary

Report what was done:

- Version bumped: `<old>` -> `<new>`
- PR opened/merged: `<PR URL>`
- Migrations applied to production: `<count>` (or "none")
- Git tag: `v<new-version>`
- Vercel deployment: remind the user to check the production URL
