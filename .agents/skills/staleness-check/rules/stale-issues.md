# stale-issues

**Category**: GitHub Issues | **Severity**: MEDIUM

## What to Check

Open issues that are resolved, outdated, or need updating.

## Detection Steps

### 1. List all open issues with age

```bash
gh issue list --state open --json number,title,labels,updatedAt,assignees --limit 100
```

### 2. Check for stale issues (no activity > 30 days)

```bash
gh issue list --state open --json number,title,updatedAt | \
  jq '.[] | select(.updatedAt < (now - 2592000 | todate))'
```

### 3. Check untested issues against actual test files

```bash
# Get untested issues
gh issue list --label "untested" --state open --json number,title,body

# For each, check if tests now exist
# Cross-reference the module/component mentioned in the issue body
```

### 4. Check for issues resolved by recent commits

```bash
# Recent commits that mention issue numbers
git log --oneline --since="2 weeks ago" | grep -oP '#\d+'

# Cross-reference with open issues
```

### 5. Check milestone assignments

```bash
gh issue list --state open --json number,milestone | \
  jq '.[] | select(.milestone == null)'  # Issues without milestones
```

## Actions

| Finding                      | Action                                                  |
| ---------------------------- | ------------------------------------------------------- |
| Issue resolved but open      | Close with comment referencing the PR/commit            |
| Issue stale > 30 days        | Comment asking for status, or close if clearly outdated |
| Untested issue now has tests | Close with "Tests added in [commit]"                    |
| Issue scope changed          | Update title and description                            |
| Issue no longer relevant     | Close as "not planned" with explanation                 |
