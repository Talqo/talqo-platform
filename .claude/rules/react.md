---
paths:
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.jsx"
  - "**/*.js"
---

## Context

Guidelines for scalable React. Functional components, hooks, composition.

## Best Practices

### Components

```tsx
// ❌ Bad: Class component, any type, native tags, inline styles
class UserCard extends React.Component<any, any> {
	render() {
		return (
			<div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
				<h1>{this.props.name}</h1>
			</div>
		)
	}
}

// ✅ Good: Functional, typed, composable, Tailwind + shadcn
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type UserCardProps = {
	name: string
	role?: string
	onAction: () => void
}

export const UserCard = ({ name, role = "User", onAction }: UserCardProps) => {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-base font-semibold">{name}</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">{role}</p>
				<Button type="button" variant="secondary" size="sm" onClick={onAction}>
					View
				</Button>
			</CardContent>
		</Card>
	)
}
```

### Data Fetching

Prefer TanStack Query for server state. Raw `useEffect` + `fetch` ok only for non-REST sources (WebSockets, SSE, browser APIs) or when query library unavailable.

```tsx
// ✅ Good: TanStack Query for server state
import { useQuery } from "@tanstack/react-query"

const useUser = (userId: string) => {
	return useQuery({
		queryKey: ["user", userId],
		queryFn: () => fetch(`/api/users/${userId}`).then((r) => r.json()),
	})
}

// ✅ Good: useEffect + AbortController when query library not appropriate
const useUserData = (userId: string) => {
	const [data, setData] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		const controller = new AbortController()
		setLoading(true)

		const fetchData = async () => {
			try {
				const result = await api.getUser(userId, { signal: controller.signal })
				setData(result)
			} catch (err) {
				// Ignore abort errors — intentional cleanup, not real failures
				if (controller.signal.aborted) return
				setError(err instanceof Error ? err : new Error(String(err)))
			} finally {
				if (!controller.signal.aborted) setLoading(false)
			}
		}

		fetchData()
		return () => { controller.abort() }
	}, [userId])

	return { data, loading, error }
}
```

### Patterns

- **Compound Components:** Related functionality (e.g. `Select` + `Select.Option`)
- **Custom Hooks:** Reusable logic (data fetching, forms)
- **Context Provider:** Dependency injection + state sharing
- **Container/Presentational:** Separate logic from UI when complex

### Structure

- `src/components/` — Reusable UI
- `src/features/` — Domain-specific features
- `src/hooks/` — Shared hooks
- `src/pages/` — Route-level components
- `src/utils/` — Helpers
- `src/types/` — Shared TypeScript aliases

### Accessibility

- Semantic HTML (`<main>`, `<nav>`, `<article>`)
- ARIA attributes for interactive elements
- Keyboard navigation support
- Proper color contrast

## Boundaries

- ✅ **Always:** Functional components with hooks
- ✅ **Always:** Use project design system or shared UI primitives consistently
- ✅ **Always:** Maintainable, centralized styles (no large inline style objects)
- ✅ **Always:** Error Boundaries
- ✅ **Always:** All dependencies in `useEffect` arrays
- ⚠️ **Ask:** Before new test framework or tool (use RTL + Vitest or Jest per existing setup)
- ⚠️ **Ask:** Before new dependencies
- ⚠️ **Ask:** Before external state-management or data-fetching libraries
- 🚫 **Never:** Class components
- 🚫 **Never:** Direct DOM manipulation (use `useRef`)
- 🚫 **Never:** Hardcoded hex colors/pixels — use theme tokens
- 🚫 **Never:** Prop drilling beyond 2-3 layers
