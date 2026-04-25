# General Software Engineering Principles

Core philosophy: **simple, maintainable, robust** code

## Context

Override language-specific rules. Foundational principles all code follows.

## Best Practices

### Philosophies

- **Simplicity (KISS):** Clear > clever
  - Easy to understand, reason about, debug
  - Break complex into small, focused units
  - Readability > novelty
  - Abstraction only for clarity or reuse
- **YAGNI:** Build current requirements. No speculation
  - Solve validated problem before adding flexibility
  - No premature generalization, plugins, extension points without demand
  - Add complexity incrementally
  - Reversible decisions > irreversible early
- **DRY:** One source of truth per rule, behavior, concept
  - No duplicated logic — diverges, becomes inconsistent
  - Centralize shared policies, validations, domain rules
  - Abstract related duplication only. No forced coupling
  - Consistency of meaning > mere deduplication

### SOLID

- **SRP:** One responsibility per module
- **OCP:** Extend via composition/extension, not risky modification
- **LSP:** Subtypes work wherever base types expected
- **ISP:** Focused interfaces. No unused method dependencies
- **DIP:** Depend on abstractions, stable contracts. Not volatile details

### Problem Framing

- Start with problem + outcome before tools or patterns
- Define constraints + success criteria before code
- Fix root causes, not symptoms

### Design And Architecture

- Cohesive modules, loose coupling. No hidden cross-module deps
- Explicit boundaries: domain logic, infrastructure, presentation
- Composition + clear contracts > deep inheritance

### Code Quality

- Meaningful names, explicit intent, predictable behavior
- One responsibility per function/component
- Explicit data flow > implicit side effects

### Comments

**Default: no comment.** Code self-explanatory via naming. Comment only for *why*

**Litmus test:** Delete comment → reader must check git blame or ask teammate? Keep. Else delete

- **Why:** Business constraints, edge cases, non-obvious reasons. Not what code does
- **Tradeoffs:** Record rationale when alternatives considered or obvious approach avoided
- **No changelog comments.** Must make sense to reader with zero change history knowledge
- **Short.** One line ideal. Two max

**Bad** — restates code or changelog:

```python
# Sort users by last login
users.sort(key=lambda u: u.last_login)
if user.role == Role.ADMIN:
MAX_BATCH_SIZE = 10  # changed from 5, old too low
await process_batch(items)  # replaced threading with asyncio
schema.validate(payload)  # removed old validation
```

**Good** — code cannot say this:

```python
# Cold accounts first — free up batch slots
users.sort(key=lambda u: u.last_login)
# Admins bypass rate limiting per enterprise contract
if user.role == Role.ADMIN:
# Benchmarked: 10 saturates pool, no OOM
MAX_BATCH_SIZE = 10
await process_batch(items)
schema.validate(payload)
```

### Correctness And Reliability

- Validate assumptions at boundaries. Fail fast on bad input
- Handle errors deliberately: detect, report, recover or fail safe
- Explicit state transitions. No ambiguous behavior
- Graceful degradation on partial failures

### Testing And Verification

- Right level: unit, integration, e2e as needed
- Prioritize critical flows + regression-prone paths
- Deterministic tests, aligned with real usage
- CI = quality gate, not afterthought

### Maintainability And Evolution

- Remove dead code, outdated docs, accidental complexity
- Iterative refactoring > large rewrites unless justified
- Sync docs + contracts with behavior
- Shared conventions for safe module movement

### Security And Operability

- Security, privacy, compliance = baseline
- No hardcoded secrets. Managed config, least privilege
- Observable: logs, metrics, actionable errors
- Safe, repeatable, reversible operations

## Boundaries

- ✅ **Always:** Solve real problem before optimizing
- ✅ **Always:** Explicit, testable, observable behavior
- ✅ **Always:** Document decisions affecting future changes
- ⚠️ **Ask:** Major dependencies or architectural changes
- ⚠️ **Ask:** Irreversible or high-impact operational changes
- 🚫 **Never:** Trade long-term maintainability for short-term convenience
- 🚫 **Never:** Hide errors, risks, uncertainty
- 🚫 **Never:** Compromise security, data safety, correctness for speed
