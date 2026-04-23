# Widget Rating Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the conversation rating prompt after the user's first question instead of after 3 assistant messages, and implement cumulative star hover highlighting using CSS `:has()`.

**Architecture:** Adjust the rating trigger condition in `useWidget.ts` from `assistantCount >= 3` to check for at least one user message plus one assistant response. Replace the per-star hover styles in `default.css` with `:has()` sibling selectors so hovering star N highlights stars 1 through N. Keep all markup and widget architecture unchanged — custom CSS, no Tailwind, no shadcn.

**Tech Stack:** React, vanilla CSS, Bun, Vitest (via `bun:test` built-in runner)

---

### Task 1: Extract rating trigger condition into a testable pure helper

**Files:**
- Modify: `packages/widget/src/hooks/useWidget.ts`
- Create: `packages/widget/src/hooks/ratingTrigger.ts`
- Test: `packages/widget/src/hooks/ratingTrigger.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, test, expect } from "bun:test"
import { shouldShowRatingPrompt } from "./ratingTrigger"

describe("shouldShowRatingPrompt", () => {
  test("returns false when there are no user messages", () => {
    const messages = [{ role: "assistant" }, { role: "assistant" }]
    expect(shouldShowRatingPrompt(messages as any, false)).toBe(false)
  })

  test("returns false when there is a user message but no assistant response yet", () => {
    const messages = [{ role: "user" }]
    expect(shouldShowRatingPrompt(messages as any, false)).toBe(false)
  })

  test("returns true after at least one user message and one assistant response", () => {
    const messages = [
      { role: "assistant", content: "Hi!" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "How can I help?" },
    ]
    expect(shouldShowRatingPrompt(messages as any, false)).toBe(true)
  })

  test("returns false when rating has already been submitted", () => {
    const messages = [
      { role: "user" },
      { role: "assistant" },
    ]
    expect(shouldShowRatingPrompt(messages as any, true)).toBe(false)
  })

  test("returns false for welcome-only conversation", () => {
    const messages = [{ role: "assistant", content: "Welcome!" }]
    expect(shouldShowRatingPrompt(messages as any, false)).toBe(false)
  })
})
```

- [ ] **Step 2: Create the helper module**

Create `packages/widget/src/hooks/ratingTrigger.ts`:

```typescript
import type { Message } from "./useWidget"

export function shouldShowRatingPrompt(
  messages: Message[],
  ratingSubmitted: boolean,
): boolean {
  if (ratingSubmitted) return false

  const hasUserMessage = messages.some((m) => m.role === "user")
  const hasAssistantResponse = messages.some(
    (m) => m.role === "assistant" && m.content !== "Hi! How can I help you today?",
  )

  return hasUserMessage && hasAssistantResponse
}
```

- [ ] **Step 3: Run the test and verify it passes**

Run:
```bash
bun test packages/widget/src/hooks/ratingTrigger.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/widget/src/hooks/ratingTrigger.ts packages/widget/src/hooks/ratingTrigger.test.ts
git commit -m "feat(widget): extract rating trigger condition into testable helper"
```

---

### Task 2: Wire the helper into the useWidget hook and remove old condition

**Files:**
- Modify: `packages/widget/src/hooks/useWidget.ts`

- [ ] **Step 1: Import the helper at the top of useWidget.ts**

```typescript
import { shouldShowRatingPrompt } from "./ratingTrigger"
```

- [ ] **Step 2: Replace the rating useEffect body**

Find this block in `useWidget.ts` (around lines 352-357):

```typescript
useEffect(() => {
  const assistantCount = messages.filter((m) => m.role === "assistant").length
  if (assistantCount >= 3 && !ratingSubmitted) {
    setShowRatingPrompt(true)
  }
}, [messages, ratingSubmitted])
```

Replace with:

```typescript
useEffect(() => {
  if (shouldShowRatingPrompt(messages, ratingSubmitted)) {
    setShowRatingPrompt(true)
  }
}, [messages, ratingSubmitted])
```

- [ ] **Step 3: Run type check and lint for the widget package**

Run:
```bash
cd packages/widget && bun run type-check
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/widget/src/hooks/useWidget.ts
git commit -m "feat(widget): show rating after first user question + assistant response"
```

---

### Task 3: Add cumulative hover styles for rating stars using :has()

**Files:**
- Modify: `packages/widget/src/theme/default.css`

- [ ] **Step 1: Replace the existing rating-star hover rules**

Find these rules in `default.css` (around lines 401-428):

```css
.aiw-rating-stars {
  display: flex;
  gap: 0.125rem;
}

.aiw-rating-stars button {
  display: flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--widget-text-secondary);
  border-radius: 0.125rem;
  padding: 0;
}

.aiw-rating-stars button:hover {
  color: #fbbf24;
  transform: scale(1.2);
}

.aiw-rating-stars button:active {
  transform: scale(0.95);
}
```

Replace with:

```css
.aiw-rating-stars {
  display: flex;
  gap: 0.125rem;
}

.aiw-rating-stars button {
  display: flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--widget-text-secondary);
  border-radius: 0.125rem;
  padding: 0;
}

.aiw-rating-stars button:hover {
  color: #fbbf24;
  transform: scale(1.2);
}

.aiw-rating-stars button:active {
  transform: scale(0.95);
}

/* Cumulative hover: hovering a star highlights it and all preceding stars */
.aiw-rating-stars:has(button:nth-child(1):hover) button:nth-child(-n+1),
.aiw-rating-stars:has(button:nth-child(2):hover) button:nth-child(-n+2),
.aiw-rating-stars:has(button:nth-child(3):hover) button:nth-child(-n+3),
.aiw-rating-stars:has(button:nth-child(4):hover) button:nth-child(-n+4),
.aiw-rating-stars:has(button:nth-child(5):hover) button:nth-child(-n+5) {
  color: #fbbf24;
}
```

- [ ] **Step 2: Run linter on the CSS file**

Run:
```bash
cd packages/widget && bun run lint
```

Expected: No lint errors.

- [ ] **Step 3: Verify in dev mode**

Run the widget dev server:
```bash
cd packages/widget && bun run dev
```

1. Open the widget in the browser
2. Send one user message and wait for the assistant response
3. Verify the rating prompt appears (5 stars)
4. Hover over star 3 — verify stars 1, 2, and 3 all turn gold
5. Hover over star 5 — verify all 5 stars turn gold
6. Switch to dark mode — verify colors still work

- [ ] **Step 4: Commit**

```bash
git add packages/widget/src/theme/default.css
git commit -m "fix(widget): cumulative star hover highlight using :has()"
```

---

## Verification Checklist

Before finishing, run the full feedback loop:

```bash
bun run check --write --unsafe
bun run type-check
```

If there are project-wide tests (`bun run test`), ensure they pass.

---

## Spec Coverage Check

| Requirement in spec | Covered by task |
|---|---|
| Show rating after user's first question + assistant response | Task 1 + Task 2 |
| Cumulative star hover (hover N fills 1..N) | Task 3 |
| No Tailwind, no shadcn in widget package | Verified — all changes are vanilla CSS and React |

## Placeholder Scan

- No "TBD", "TODO", or "implement later" found.
- No "Add appropriate error handling" or vague instructions.
- All code blocks contain complete, runnable code.

## Type Consistency Check

- `shouldShowRatingPrompt` accepts `Message[]` and `boolean` everywhere.
- `Message` type is imported from `useWidget.ts` in the helper.
- No renamed or mismatched function signatures.
