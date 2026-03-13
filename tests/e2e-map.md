# E2E Test Selection Map

Run only the specs whose trigger areas overlap with your changes.

| Spec file                            | Run when you change…                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `e2e/home.spec.ts`                   | Landing page, `src/app/(public)/page.tsx`, layout shell, nav bar                  |
| `e2e/navigation.spec.ts`             | Nav links, route structure, header/sidebar components                             |
| `e2e/layout.spec.ts`                 | Layout components, responsive styling, viewport-dependent rendering               |
| `e2e/auth-feature.spec.ts`           | Auth pages, login/signup flow, middleware, session handling, Supabase auth config |
| ~~`e2e/posting-creation.spec.ts`~~   | **DELETED** — old posting form at /postings/new no longer exists                  |
| ~~`e2e/discover-filtering.spec.ts`~~ | **DELETED** — /discover page replaced by Explore space                            |
| `e2e/application-flow.spec.ts`       | Join requests, application UI, owner review flow, notification triggers           |
| `e2e/cross-user-visibility.spec.ts`  | RLS policies, profile/posting visibility, Supabase queries with joins             |
| `e2e-full/posting-lifecycle.spec.ts` | Multi-step posting flows, end-to-end owner+developer interactions                 |
| `e2e-full/invite-lifecycle.spec.ts`  | Invite/friend-ask flow, accept/decline lifecycle                                  |
