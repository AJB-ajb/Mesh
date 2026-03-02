---
name: scientific-debugging
description: >
  Scientific hypothesis-driven debugging for hard problems. Use this skill whenever Claude is
  debugging, troubleshooting, or fixing bugs and a previous fix attempt has already failed.
  Also use when the user explicitly asks to debug scientifically, use hypotheses, test theories,
  or take a more systematic approach to a stubborn issue. Apply proactively any time you notice
  you're in a fix-fail loop, the root cause is unclear, or the same error keeps reappearing
  after attempted fixes.
---

# Scientific Debugging

Direct fixes work for 95% of bugs. This skill is for the other 5% — when you've tried 2+ fixes and the problem persists. The failure mode is premature conclusion: you convince yourself you understand the problem and apply changes based on a wrong model. The fix is to separate diagnosis from treatment.

## When to activate

- After 2 failed fix attempts on the same problem
- When the user asks for hypothesis-driven debugging
- When error behavior contradicts your mental model

Do NOT activate for straightforward bugs, typos, or obvious errors.

## The method

**Stop editing code.** Briefly tell the user you're switching to diagnosis mode.

1. **Note your confusions.** What doesn't fit your mental model? Confusions point at wrong assumptions — name them explicitly rather than glossing over them.

2. **List 2-3 hypotheses** for the root cause. For each, note supporting/contradicting evidence and how testable it is. Keep it brief — a line or two per hypothesis, not paragraphs.

3. **Test before fixing.** Design the smallest experiment that distinguishes between hypotheses. Prefer reading (logging, assertions) over writing (code changes). Prefer tests that give binary answers: "if H1, I'll see X; if H2, I'll see Y."

4. **Fix only when confirmed.** State which hypothesis the evidence supports, then apply a targeted fix. Keep diagnostic code in place until the fix is verified — remove it after, not during.

## Key ideas

- Maximize information per experiment. Every test should teach you something regardless of outcome.
- Isolate the phenomenon. Reproduce in the smallest possible context.
- Resist premature conclusions. Evidence > plausible stories.
