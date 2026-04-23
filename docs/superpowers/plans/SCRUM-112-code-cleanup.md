# SCRUM-112: Frontend Code Pattern Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix anti-patterns and bad practices across `apps/web/src`: mutateAsync `.then()`, hardcoded fixed dimensions, console error swallows without user feedback, and inline onSuccess/onError passed to .mutate().

**Architecture:** Self-contained component-level refactors with no functional changes. All patterns already audited in codebase.

**Tech Stack:** React, TanStack Query, Tailwind CSS, TypeScript

---

### Task 1: Replace mutateAsync .then() with await

**Files:**
- Modify: `apps/web/src/routes/verify-email.tsx:119-148`

- [ ] **Step 1: Refactor to async/await**

  ```typescript
  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    if (!token) {
      setState({
        status: "error",
        code: "MISSING_TOKEN",
        message: "Verification token is missing. Please check your email link.",
      })
      return
    }

    async function verify() {
      try {
        const data = await verifyEmail.mutateAsync({ token })
        setState({ status: "success" })
        if (data.token) {
          localStorage.setItem(AUTH.TOKEN_KEY, data.token)
        }
        setTimeout(() => {
          navigate({ to: "/dashboard" })
        }, 2000)
      } catch (err) {
        const error = err as ApiError
        const code = error.error?.code || "UNKNOWN_ERROR"
        let message = "Verification failed. Please try again."

        if (code === "INVALID_TOKEN") {
          message =
            "The verification link is invalid. Please request a new one."
        } else if (code === "TOKEN_EXPIRED") {
          message = "The verification link has expired. Please register again."
        } else if (code === "EMAIL_ALREADY_VERIFIED") {
          message = "This email has already been verified. You can log in now."
        }

        setState({ status: "error", code, message })
      }
    }

    verify()
    // Only run when token changes (on initial load with token from URL)
  }, [token, navigate, verifyEmail])
  ```

- [ ] **Step 2: Remove unused import**

  Ensure `ApiError` type import is still needed (it is, inside the catch block).

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/routes/verify-email.tsx
  git commit -m "refactor(web): replace mutateAsync then with async/await"
  ```

### Task 2: Audit & fix hardcoded dimensions in route/component files

**Files to modify:**
- `apps/web/src/routes/backoffice.chats.tsx:107,115` — change `h-[400px]` → `min-h-[300px]` with flex `flex-1`
- `apps/web/src/routes/backoffice.index.tsx:130,138` — same `h-[400px]` → `min-h-[300px]` + `flex-1`
- `apps/web/src/components/error/ErrorBoundary.tsx:44` — `min-h-[400px]` is already OK (min-height, not fixed)
- `apps/web/src/components/charts/TokenConsumptionChart.tsx:35` — `h-[300px]` in chart container: add `min-h` wrapper and chart internal `h-full`
- `apps/web/src/components/charts/QuestionsAskedChart.tsx:35` — same as above
- `apps/web/src/components/widget/setup/WidgetPreview.tsx:65,110,137` — fixed preview heights are intentional for the preview mockup, keep as-is (comment why)
- `apps/web/src/components/widget/WidgetSetup.tsx:76` — `lg:w-[28rem]` is acceptable for a fixed side-panel

- [ ] **Step 1: Fix backoffice.chats.tsx**

  ```tsx
  // Line 107
  <div className="flex min-h-[300px] flex-1 items-center justify-center">
  // Line 115
  <div className="flex min-h-[300px] flex-1 items-center justify-center">
  ```

- [ ] **Step 2: Fix backoffice.index.tsx**

  ```tsx
  // Line 130
  <div className="flex min-h-[300px] flex-1 items-center justify-center">
  // Line 138
  <div className="flex min-h-[300px] flex-1 items-center justify-center">
  ```

- [ ] **Step 3: Wrap chart CardContent to use min-height instead of fixed height**

  **File:** `apps/web/src/components/charts/TokenConsumptionChart.tsx`

  Change:
  ```tsx
  <CardContent className="h-[300px]">
  ```
  to:
  ```tsx
  <CardContent className="min-h-[200px] flex-1">
  ```

  Same for `QuestionsAskedChart.tsx`.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/routes/backoffice.chats.tsx apps/web/src/routes/backoffice.index.tsx apps/web/src/components/charts/TokenConsumptionChart.tsx apps/web/src/components/charts/QuestionsAskedChart.tsx
  git commit -m "refactor(web): replace fixed heights with min-height flex patterns"
  ```

### Task 3: Remove console.error logs that swallow errors without UI feedback

**Files:**
- `apps/web/src/components/bot-config/BotConfigForm.tsx:81`
- `apps/web/src/components/bot-config/BlacklistManager.tsx:70,82`
- `apps/web/src/components/widget/setup/EmbedCodeCard.tsx:82`
- `apps/web/src/components/widget/OnboardingPopup.tsx:34`

- [ ] **Step 1: Audit each console.error**

  These are all inside `catch` blocks where the error is already surfaced to the user via the mutation's `error` state and UI toast. The `console.error` adds noise.

  **Remove** or **leave a single debug log** behind a `import.meta.env.DEV` guard.

  ```typescript
  if (import.meta.env.DEV) {
    console.error("Failed to save bot config:", err)
  }
  ```

- [ ] **Step 2: Apply to each file**

  Replace each bare `console.error(...)` in `catch` blocks with the DEV-guarded version.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/components/bot-config/BotConfigForm.tsx apps/web/src/components/bot-config/BlacklistManager.tsx apps/web/src/components/widget/setup/EmbedCodeCard.tsx apps/web/src/components/widget/OnboardingPopup.tsx
  git commit -m "refactor(web): guard dev-only console.error statements"
  ```

### Task 4: Inline onSuccess/onError on .mutate() calls

**Files:**
- `apps/web/src/routes/verify-email.tsx:91-103` — `handleResend` uses inline `onSuccess`/`onError`
- `apps/web/src/components/mcp/CustomServerDialog.tsx` — check for inline callbacks
- `apps/web/src/components/settings/AccountSettingsTab.tsx` — check for inline callbacks

- [ ] **Step 1: Replace inline callbacks with state-driven UI where possible**

  For `verify-email.tsx` `handleResend`:
  ```typescript
  const handleResend = async () => {
    if (!resendEmail || !canResend) return
    try {
      await resendVerification.mutateAsync({ email: resendEmail })
      setResendSuccess(true)
      setCanResend(false)
      setResendTimeout(60)
    } catch {
      setResendSuccess(false)
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/routes/verify-email.tsx
  git commit -m "refactor(web): replace inline onSuccess/onError with await"
  ```

### Task 5: Run checks

- [ ] **Step 1:** `bun run check --write --unsafe`
- [ ] **Step 2:** `bun run type-check`
- [ ] **Step 3:** Commit any biome changes
