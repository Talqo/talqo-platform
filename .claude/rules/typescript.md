---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

## Context

Guidelines for idiomatic, strict TypeScript

## Fundamentals

### Nullish coalescing `??` over `||` for defaults

`||` triggers on any falsy value (`0`, `""`, `false`). `??` triggers only on `null`/`undefined`.

```ts
// ❌ — 0 and "" are valid values, || swallows them
const port = config.port || 3000      // port=0 → returns 3000 (wrong)
const label = config.label || "N/A"   // label="" → returns "N/A" (wrong)

// ✅
const port = config.port ?? 3000
const label = config.label ?? "N/A"
```

### `undefined` over `null` for absent values

TypeScript optional properties (`?:`) produce `undefined`. Mixing `null` and `undefined` for "nothing" adds pointless branching. Default to `undefined`; use `null` only at explicit API boundaries that require it (e.g. JSON payloads, DB columns).

```ts
// ❌ — callers must check both
type User = { avatar: string | null | undefined }

// ✅
type User = { avatar?: string }   // absent = undefined
```

### `Array.isArray()` over `instanceof Array`

`instanceof` breaks across iframes and module realms. `Array.isArray` is universal.

```ts
// ❌
if (value instanceof Array) { ... }

// ✅
if (Array.isArray(value)) { ... }
```

### `for...of` for iteration

`forEach` cannot `break` or `return` early. `for...of` can.

```ts
// ❌ — can't short-circuit
items.forEach((item) => {
	if (item.done) return   // only skips this iteration, doesn't stop
	process(item)
})

// ✅
for (const item of items) {
	if (item.done) break
	process(item)
}
```

`forEach` is fine for fire-and-forget side effects where early exit is not needed.

## Debatable Defaults

### `type` over `interface`

Use `type` for all shapes, props, aliases. `interface` only when augmenting third-party types via declaration merging.

```ts
// ❌ interface — no practical advantage for most cases
interface User {
	id: string
	name: string
}

// ✅
type User = {
	id: string
	name: string
}

// ✅ Exception: augmenting globals or third-party types
interface Window {
	analytics: Analytics
}
```

### Union types over `enum`

Enums emit runtime JS, block tree-shaking, and behave unexpectedly across module boundaries. String union literals are zero-cost.

```ts
// ❌
enum Status {
	Active = "active",
	Inactive = "inactive",
}

// ✅
type Status = "active" | "inactive"

// ✅ When you need iteration or a value map
const STATUS = {
	Active: "active",
	Inactive: "inactive",
} as const
type Status = (typeof STATUS)[keyof typeof STATUS]
```

### Infer return types on private functions, explicit on public API

```ts
// ✅ Infer — body makes it obvious
const double = (n: number) => n * 2

// ✅ Explicit — exported, non-trivial, or documents a contract
export const getUser = async (id: string): Promise<User | null> => { ... }
```

### `satisfies` over `as` for literal narrowing

`as` suppresses errors. `satisfies` validates shape while preserving literal types.

```ts
// ❌ — silences the compiler, doesn't validate
const config = { port: 8080, host: "localhost" } as Config

// ✅ — validated + keeps literal inference
const config = { port: 8080, host: "localhost" } satisfies Config
```

### `Record<K, V>` over index signatures

```ts
// ❌
type RoleMap = { [role: string]: Permission[] }

// ✅
type RoleMap = Record<string, Permission[]>
```

## Type Safety

### `unknown` over `any`

`any` disables type checking entirely. `unknown` forces narrowing before use.

```ts
// ❌
function parse(data: any) {
	return data.name   // no error, runtime bomb
}

// ✅
function parse(data: unknown): string {
	if (typeof data === "object" && data !== null && "name" in data) {
		return String((data as { name: unknown }).name)
	}
	throw new Error("Invalid shape")
}
```

### Type guards over `as` assertions

```ts
// ❌
const user = response as User

// ✅
function isUser(value: unknown): value is User {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as User).id === "string"
	)
}
```

### Avoid non-null assertion `!`

`!` crashes when the assumption is wrong. Narrow explicitly or use optional chaining.

```ts
// ❌
const name = user!.profile!.name

// ✅
const name = user?.profile?.name ?? "Unknown"
```

### `readonly` for immutable data

```ts
type Config = {
	readonly host: string
	readonly ports: readonly number[]
}
```

### `as const` for literal types

Prevents widening to `string`, `number`, etc.

```ts
// ❌ widened to string[]
const methods = ["GET", "POST", "DELETE"]

// ✅ readonly tuple of literals
const methods = ["GET", "POST", "DELETE"] as const
```

## Imports

`verbatimModuleSyntax` is enabled. Type-only imports **must** use `import type`.

```ts
// ❌ — fails verbatimModuleSyntax
import { User } from "./types"

// ✅
import type { User } from "./types"

// ✅ Mixed value + type
import { createUser, type User } from "./user"
```

## Naming

| Thing | Convention | Example |
|---|---|---|
| Types | PascalCase | `UserProfile`, `ApiResponse` |
| Type parameters | Single uppercase or PascalCase | `T`, `TValue` |
| Constants | `SCREAMING_SNAKE` or `camelCase` | `MAX_RETRIES`, `defaultTimeout` |
| Functions, variables | camelCase | `getUser`, `isLoading` |
| Files | kebab-case | `user-service.ts` |

Avoid `I` prefix on types (`IUser` is C#-ism, not TS convention).

## Error Handling

Anything can be thrown in JS — narrow before accessing properties.

```ts
try {
	await fetchUser(id)
} catch (err) {
	const message = err instanceof Error ? err.message : String(err)
	logger.error(message)
}
```

## Utility Types

Use built-ins instead of manual re-implementation.

```ts
type UserUpdate = Partial<User>
type PublicUser = Omit<User, "passwordHash">
type StringValues = Extract<string | number | boolean, string>
```

Avoid `Partial<T>` when you mean "optional on creation" — model the create type explicitly.

## Avoid

- `Function` type — use explicit signature: `() => void`, `(id: string) => Promise<User>`
- `object` type — use `Record<string, unknown>` or a specific shape
- `namespace` — use ES modules
- `||` for defaults when `0`, `""`, or `false` are valid — use `??`
- Type assertions on unvalidated external data — use a type guard or schema validation

## Boundaries

- ✅ **Always:** `strict: true` in tsconfig
- ✅ **Always:** `import type` for type-only imports
- ✅ **Always:** `type` over `interface` for new definitions
- ✅ **Always:** Union string literals over `enum`
- ✅ **Always:** `??` for defaults where `0`/`""` are valid values
- ✅ **Always:** `undefined` for absent values; `null` only at explicit API boundaries
- ✅ **Always:** `unknown` for unvalidated external data; narrow before use
- ⚠️ **Ask:** Before conditional types or complex mapped types — simpler usually better
- 🚫 **Never:** `any` — use `unknown` + narrowing or a specific type
- 🚫 **Never:** Non-null assertion `!` on data that could realistically be absent
- 🚫 **Never:** `as` to silence a type error — fix the type
- 🚫 **Never:** `namespace` — ES modules only
