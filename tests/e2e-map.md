# E2E Test Selection Map

Run only the specs whose trigger areas overlap with your changes.

| Spec file                            | Run when you change…                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `e2e/layout.spec.ts`                 | Layout components, responsive styling, viewport-dependent rendering               |
| `e2e/auth-feature.spec.ts`           | Auth pages, login/signup flow, middleware, session handling, Supabase auth config |
| `e2e/cross-user-visibility.spec.ts`  | RLS policies, profile/posting visibility, Supabase queries with joins             |
| `e2e/card-lifecycle.spec.ts`         | Card types (poll, time proposal, RSVP, task claim), voting, auto-resolve, privacy |
| `e2e-full/space-lifecycle.spec.ts`   | Space creation, messaging, posting join lifecycle, membership, access control     |
| `e2e-full/profile-lifecycle.spec.ts` | Profile editing, skills CRUD, cross-user profile visibility, validation           |
