# React Hook Form Migration Design

**Date:** 2026-04-18
**Branch:** SCRUM-77-react-hook-form
**Scope:** Migrate all forms in `apps/web` to react-hook-form + zodResolver + shadcn Form components. Delete the custom `useForm` hook.

---

## Architecture

Install into `apps/web`:
- `react-hook-form`
- `@hookform/resolvers`

Every form uses:

```ts
const form = useForm<T>({ resolver: zodResolver(schema), mode: "onBlur" })
```

`mode: "onBlur"` — errors appear after leaving a field, matching current UX.

Form markup is wrapped in shadcn's `<Form>`. Each field follows:

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

`<FormMessage>` reads from RHF's field state — no manual error wiring needed.

The custom hook at `apps/web/src/lib/useForm.ts` is deleted entirely after migration.

---

## Form Inventory

| Form | File | Schema | Notes |
|------|------|--------|-------|
| Login | `routes/login.tsx` | `loginSchema` (shared) | No schema changes |
| Register | `routes/register.tsx` | `registerSchema` (web/schemas/auth) | Already has confirmPassword extension |
| ForgotPassword | `components/auth/ForgotPasswordForm.tsx` | `ForgotPasswordSchema` (shared) | Single-field form |
| ResetPassword | `components/auth/ResetPasswordForm.tsx` | `resetPasswordFormSchema` (web/schemas/auth) | Token is a URL param, not a form field |
| BotConfig | `components/bot-config/BotConfigForm.tsx` | `botConfigSchema` (web/schemas/bot) | null↔string coercion at submit boundary |
| AddFunds | `components/billing/AddFundsForm.tsx` | `addFundsFormSchema` (web/schemas/billing, extends shared `addFundsBodySchema`) | Mock card fields; mutation sends only `{ amount }` |
| ProviderConfig | `components/settings/ProviderConfigTab.tsx` | `providerConfigFormSchema` (web/schemas/provider-config, reuses shared `providerTypeSchema`) | Conditional baseUrl via superRefine |
| BlacklistManager | `components/bot-config/BlacklistManager.tsx` | `addWordBodySchema` (shared) | Duplicate check remains as runtime guard in onSubmit |
| AccountSettings | `components/settings/AccountSettingsTab.tsx` | `updateProfileBodySchema` + `changePasswordBodySchema` (shared) | Two separate useForm instances; stub onSubmit |
| BillingSettings | `components/settings/BillingSettingsTab.tsx` | `usageLimitBodySchema` + `usageAlertBodySchema` (shared) | Two separate useForm instances; stub onSubmit |

---

## Special Cases

### BotConfig: null↔string coercion

The API returns `null` for unset fields; RHF inputs cannot hold `null`.

- `defaultValues` maps `null` → `""` (empty string)
- In `onSubmit`, map `""` → `null` before calling the API
- The Zod schema (`botConfigSchema`) is unchanged — coercion lives only at the submit boundary

### AddFunds: masked inputs

Card number and expiry use `FormField` to intercept `onChange`, run the formatter, and store the formatted value in RHF state.

The card fields (card number, expiry, CVV, name on card) are **mock UI elements** for demo purposes. The mutation (`useAddFunds`) only sends `{ amount }` — no card data is submitted to the API.

A new file `apps/web/src/schemas/billing.ts` holds the form schema, extending the shared `addFundsBodySchema`:

```ts
export const addFundsFormSchema = addFundsBodySchema.extend({
  cardNumber: z.string().regex(/^\d{4} \d{4} \d{4} \d{4}$/, "Invalid card number"),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Invalid expiry (MM/YY)"),
  cvv: z.string().regex(/^\d{3}$/, "Invalid CVV"),
  nameOnCard: z.string().min(1, "Name is required"),
})
```

In `onSubmit`, only `values.amount` is passed to `addFunds.mutate({ amount: values.amount })`. Card fields are validated client-side for UX but never sent to the backend.

### ProviderConfig: discriminated union

- Use `form.watch("providerType")` to conditionally render the `baseUrl` field
- When `providerType` changes away from `openai_compatible`, call `form.setValue("baseUrl", "")` to clear stale values
- `zodResolver` handles the discriminated union correctly — `baseUrl` required only for `openai_compatible`

---

## Cleanup

- Delete `apps/web/src/lib/useForm.ts`
- All imports of the custom hook across the codebase are removed as part of each form's migration
- Update `apps/web/CLAUDE.md` — the "Form handling" bullet currently documents the custom hook; replace it with: `react-hook-form` + `zodResolver` from `@hookform/resolvers/zod`. Wrap fields with shadcn `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`. Frontend schemas live in `src/schemas/` and extend `shared` schemas.
