# SCRUM-40: Connect FE and BE for Auth (Login, Register)

## User Roles Explained

| Role | Who | Access |
|------|-----|--------|
| **Admin** | Platform administrators | BackOffice (`/dev/backoffice`) - manage all clients |
| **Client** | Registered users who create chatbots | Dashboard (`/dashboard`) - bot config, analytics, settings |
| **End User** | Website visitors chatting with embedded widget | Widget only - chat interface, no account |

The `/admin/logout` endpoint is for BackOffice admins only. For regular clients, logout is client-side only (removing token from localStorage).

---

## Current State

### Backend
- ✅ Auth routes implemented: POST /auth/register, GET /auth/verify-email, POST /auth/login
- ✅ OpenAPI spec available at `/openapi.json`
- ✗ No server-side logout (stateless JWT)
- **NOTE:** Per instructions, we are NOT modifying backend

### Frontend Infrastructure (Already Set Up on dev)
- ✅ TanStack Query configured in `__root.tsx`
- ✅ OpenAPI-generated types in `api/generated/`
- ✅ Auth hooks: `useLogin`, `useRegister`, `useVerifyEmail`, `useLogout`
- ✅ Auth client for non-OpenAPI endpoints

### Frontend Pages (Need Updates)
- ⚠️ `LoginPage.tsx` - Has "Simulated login" placeholder, needs real API integration
- ⚠️ `RegisterPage.tsx` - Needs real API integration
- ⚠️ `VerifyEmailPage.tsx` - Uses direct fetch instead of TanStack Query hook

---

## Implementation Plan

### Phase 1: Add Dependencies

```bash
# Install react-hook-form and validation resolver
bun add react-hook-form @hookform/resolvers

# Add shadcn Form component (includes FormField, FormItem, FormLabel, FormControl, FormMessage)
bunx shadcn@latest add form
```

**Note:** The shadcn `form` component provides:
- `<Form />` - Provider that shares form state
- `<FormField />` - Bridge (Controller) connecting RHF to UI
- `<FormItem />` - Wrapper for field layout
- `<FormLabel />` - Accessible label linked to input
- `<FormControl />` - Wraps shadcn input components
- `<FormMessage />` - Auto-displays validation errors

**Usage pattern:**
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### Phase 2: Update LoginPage

**Migrate from custom `useForm` to react-hook-form with TanStack Query.**

Changes:
1. Import `useForm` and `Controller` from react-hook-form
2. Import `useLogin` mutation hook from `@/api/hooks/useAuth`
3. Replace custom form handling with react-hook-form
4. Call `useLogin().mutate()` on form submit
5. Handle loading state (show spinner on button)
6. Handle error state (show error message from API)

### Phase 3: Update RegisterPage

**Same pattern as LoginPage.**

Additional changes:
- Add confirmPassword field validation
- Use `watch` to ensure password === confirmPassword
- Show success state on registration (check email message)

### Phase 4: Update VerifyEmailPage

**Use TanStack Query hook instead of direct fetch.**

Changes:
1. Import `useVerifyEmail` mutation
2. Replace fetch call with `useVerifyEmail().mutate()`
3. Handle loading/success/error states from mutation

---

## Implementation Questions - Resolved

### ✅ Question 1: localStorage key for JWT token

**Decision:** Use `"auth_token"` (Option B)

**Action items:**
- Update `useLogin` hook to use `STORAGE_KEYS.AUTH_TOKEN` instead of hardcoded `"token"`
- Verify auth middleware uses same key

---

### ✅ Question 2: Password confirmation validation

**Decision:** Validate on submit only (no `watch`)

**Rationale:** Since we validate after clicking Register button, we don't need real-time validation. Simpler implementation, less re-renders.

**Implementation:** Add Zod refinement in schema:
```typescript
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

---

### ✅ Question 3: Form component approach

**Decision:** Use shadcn's `Form` component (Option A)

**What we'll add:**
```bash
bunx shadcn@latest add form
```

**Pattern to use:**
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

---

### ✅ Question 4: Dashboard logout button

**Decision:** Wire it up now (Option A)

**Implementation:**
```typescript
const { mutate: logout } = useLogout();
const handleLogout = () => {
  logout();
  navigate({ to: "/" });
};
```

---

### ✅ Question 5: Displaying API errors

**Decision:** Different approaches for Login vs Register

| Page | Error Display |
|------|---------------|
| **Login** | Form-level error (above submit button) for "Invalid credentials" |
| **Register** | Field-level errors for validation issues (email taken, etc.) |

**Login implementation:**
```tsx
{loginError && (
  <Alert variant="destructive">
    <AlertDescription>{loginError.message}</AlertDescription>
  </Alert>
)}
```

**Register implementation:** Field errors come from Zod validation and display via `<FormMessage />`

Once you answer these, I'll proceed with implementation.
