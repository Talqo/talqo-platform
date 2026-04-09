# SCRUM-40 CodeRabbit Review Fixes Implementation Plan

## Backend Fixes

### 1. Check pending registrations for duplicate company names (auth.repository.ts)
- **File**: `apps/api/src/modules/auth/auth.repository.ts`
- **Issue**: `savePendingRegistration()` only deduplicates by email, not name
- **Fix**: Add a check for existing pending registrations with same name (case-insensitive)
- **Lines to modify**: `savePendingRegistration` method (lines 95-104)

### 2. Normalize company name before uniqueness check (auth.service.ts, auth.repository.ts)
- **File**: `apps/api/src/modules/auth/auth.repository.ts`
- **Issue**: `findClientByName` uses exact string matching (lines 59-64), but names should be normalized
- **Fix**: Add `normalizeName()` helper that trims and converts to lowercase
- **Apply to**: `findClientByName` queries and `createClient` checks

### 3. Return distinct errors for NAME_TAKEN vs EMAIL_ALREADY_VERIFIED (auth.service.ts)
- **File**: `apps/api/src/modules/auth/auth.service.ts`
- **Issue**: Lines 51-55 collapse NAME_TAKEN into EMAIL_ALREADY_VERIFIED
- **Fix**: Keep NAME_TAKEN as distinct error during verification
- **Lines to modify**: `verifyEmail()` error handling (lines 43-58)

### 4. Update verify-email route error handling (auth.routes.ts)
- **File**: `apps/api/src/modules/auth/auth.routes.ts`
- **Issue**: Lines 153-168 still translate NAME_TAKEN and EMAIL_TAKEN into EMAIL_ALREADY_VERIFIED
- **Fix**: Remove the catch-all block that collapses errors; handle NAME_TAKEN separately with proper message
- **Lines to modify**: 153-168

## Frontend Fixes

### 5. Remove auth debug logs (auth.client.ts)
- **File**: `apps/web/src/api/auth.client.ts`
- **Issue**: Lines 96-98, 111, 116, 132 log bearer token fragments and payloads
- **Fix**: Remove all console.log/error statements in this file except for errors that actually need logging

### 6. Remove auth debug logs (useAuth.ts)
- **File**: `apps/web/src/api/hooks/useAuth.ts`
- **Issue**: Lines 25-28 have console logging in verifyEmail mutation
- **Fix**: Remove onSuccess and onError callbacks that only log

### 7. Only clear AUTH_TOKEN on authoritative auth failures (auth.client.ts)
- **File**: `apps/web/src/api/auth.client.ts`
- **Issue**: Lines 120 and 133 clear token on any non-OK response or caught exception
- **Fix**: Only remove token for 401/403 responses, not for 500/network/CORS errors
- **Lines to modify**: 118-124, 131-137

### 8. Match URL pathname instead of substring (client.ts)
- **File**: `apps/web/src/api/client.ts`
- **Issue**: Line 8 uses `request.url.includes("/admin/")` which can match query strings
- **Fix**: Parse URL and check `pathname.startsWith("/admin/")`
- **Lines to modify**: 6-16

### 9. Use onSettled for logout cleanup (useAdmin.ts)
- **File**: `apps/web/src/api/hooks/useAdmin.ts`
- **Issue**: Lines 25-28 only clear token on successful logout
- **Fix**: Use `onSettled` instead of `onSuccess` to clear token regardless of mutation outcome
- **Lines to modify**: 18-28

### 10. Use validateStoredToken() for presence checks (_authenticated.tsx)
- **File**: `apps/web/src/routes/_authenticated.tsx`
- **Issue**: Only checks token existence in localStorage, admits expired tokens
- **Fix**: Import and use `validateStoredToken()` from auth.client.ts
- **Lines to modify**: 8-16

### 11. Only clear admin token on auth failures (admin/_admin.tsx)
- **File**: `apps/web/src/routes/admin/_admin.tsx`
- **Issue**: Lines 21-24 clear token on any /admin/me failure including 5xx/network errors
- **Fix**: Only clear token for 401/403 responses
- **Lines to modify**: 17-29

### 12. Redirect to correct admin dashboard route (admin/login.tsx)
- **File**: `apps/web/src/routes/admin/login.tsx`
- **Issue**: Line 51 navigates to `/admin/dashboard` but correct route is `/admin/_admin/dashboard`
- **Fix**: Change navigation path to `/admin/_admin/dashboard`
- **Lines to modify**: 51

### 13. Guard against concurrent registration submits (register.tsx)
- **File**: `apps/web/src/routes/register.tsx`
- **Issue**: No check for `registerMutation.isPending` in submit handler; can fire multiple times
- **Fix**: Add `isPending` check and disable submit button
- **Lines to modify**: Submit handler (lines 52-66) and button (line 210)

### 14. Reject empty verification tokens (verify-email.tsx)
- **File**: `apps/web/src/routes/verify-email.tsx`
- **Issue**: Line 21 uses `z.string()` which accepts empty string `?token=`
- **Fix**: Change to `z.string().trim().min(1)`
- **Lines to modify**: 20-22

### 15. Don't persist raw verification tokens in localStorage (verify-email.tsx)
- **File**: `apps/web/src/routes/verify-email.tsx`
- **Issue**: Lines 41, 51, 73, 79, 86, 104 use raw token as localStorage key
- **Fix**: Use a hash/digest of the token instead of raw token (SHA-256 or simple obfuscation)

### 16. Set error message when wait path times out (verify-email.tsx)
- **File**: `apps/web/src/routes/verify-email.tsx`
- **Issue**: Lines 64-67 and 169-172 flip `isPending` to false without setting error message
- **Fix**: Set a concrete timeout error message

### 17. Remove cleanup that defeats StrictMode guard (verify-email.tsx)
- **File**: `apps/web/src/routes/verify-email.tsx`
- **Issue**: Lines 102-105 remove verifyingKey on unmount, allowing duplicate requests
- **Fix**: Remove the cleanup function entirely; locks are cleaned by success/error handlers
- **Lines to modify**: 102-105

### 18. Keep login password rules aligned (login.tsx, schemas/auth.ts)
- **File**: `apps/web/src/schemas/auth.ts`
- **Issue**: `loginSchema` uses `min(1)` for password but registration enforces `min(8)`
- **Fix**: Change login password to `min(8)` to fail fast
- **Lines to modify**: Line 10

## Testing Strategy

1. Run `bun run check` to ensure Biome formatting passes
2. Run `bun run typecheck` to ensure TypeScript compiles
3. Test manually:
   - Register with duplicate company names (both verified and pending)
   - Test email verification flow (especially StrictMode double-mount)
   - Test admin login/logout flow
   - Test token validation and expiration handling
