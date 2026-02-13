# type-generic-json

**Category**: Type Safety | **Severity**: MEDIUM

## Pattern

Supabase-generated types use generic `Json` for structured JSONB columns:

```ts
// BAD: loses type information
skill_levels: Json | null;
availability_slots: Json | null;
notification_preferences: Json | null;
```

## Detection

Search `src/lib/supabase/types.ts` for `Json | null` on columns that have known structures.

Cross-reference with `docs/data-model.md` JSONB Structures section.

## Fix

Create typed wrappers in a separate types file:

```ts
// src/lib/types/profile.ts
export type SkillLevels = Record<string, number>;
export type AvailabilitySlots = Record<string, string[]>;
export type NotificationPreferences = {
  email_digest: boolean;
  push_matches: boolean;
  push_messages: boolean;
};
```

Then use in hooks/components with runtime validation at the boundary:

```ts
const skillLevels = (profile.skill_levels as SkillLevels) ?? {};
```

Note: Don't modify the Supabase-generated types file directly — it gets regenerated. Create wrapper types alongside it.
