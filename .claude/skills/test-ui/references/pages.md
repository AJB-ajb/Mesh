# Page Discovery Guide

Discover routes dynamically at test time. **Do not hardcode routes** — the app evolves.

## Discovering Routes

```
Glob pattern="src/app/**/page.tsx"
```

### Interpreting Next.js App Router Structure

- `src/app/page.tsx` -> `/` (root)
- `src/app/(group)/route/page.tsx` -> `/route` (parenthesized dirs are route groups — don't appear in URL)
- `src/app/route/[param]/page.tsx` -> `/route/:param` (dynamic segment)
- `src/app/~offline/page.tsx` -> PWA offline fallback (skip)

### Building the Route Table

Map each discovered `page.tsx` to its URL route. Group them by access level:

| Category      | How to identify                            |
| ------------- | ------------------------------------------ |
| **Public**    | Root or marketing pages, no auth layout    |
| **Auth flow** | Login, signup, password reset pages        |
| **Protected** | Pages inside an authenticated layout group |
| **Dynamic**   | Pages with `[param]` segments              |
| **Special**   | PWA pages, error pages                     |

## What to Test on Each Page

For every page you visit, ask:

1. **Does it load?** — Content renders, no errors, no blank state
2. **Is it obvious what this page is for?** — Clear heading, purpose is apparent
3. **Can I take the next action?** — Primary CTA is visible, path forward is clear
4. **Does it handle edge cases?** — Empty data, long text, missing images
5. **Does it feel consistent?** — Similar to other pages in layout, style, interaction patterns

### Dynamic Pages

Pages with `[param]` need a real ID to test. Get IDs from:

- Creating a test posting in Flow 3
- Finding an entity by browsing the discover page
- Using the logged-in user's own ID for profile routes

### What to Skip

- `~offline` page (PWA internal)
- Password reset pages requiring a valid token
- Onboarding pages (may alter account state — only test if asked)
