# Software Engineering Standards

## Philosophy

- Build simple, explicit, maintainable systems.
- Optimize for correctness, readability, debuggability, and safe change.
- Solve the root problem with the smallest proper fix.
- Keep behavior consistent with the surrounding codebase.
- Make decisions from evidence gathered in code, tests, docs, logs, or authoritative sources.
- Reuse established code in the codebase and mature packages for commodity problems.
- Apply KISS, YAGNI, and DRY strictly.
- Prefer boring, reversible decisions over clever or speculative ones.

## Problem Solving

- Reproduce or inspect the failure before changing code.
- Identify the root cause before implementing a fix.
- Treat symptoms, logs, and failing tests as evidence, then verify the hypothesis.
- Implement proper fixes that remove the cause of the problem.
- Preserve useful failure signals so future issues are diagnosable.
- Define success criteria before larger implementation work.

## Design

- Start from the desired behavior, constraints, and failure modes.
- Keep modules cohesive and loosely coupled.
- Put domain rules, validation, and business concepts in one source of truth.
- Use explicit contracts between boundaries: API, database, UI, queues, files, and external services.
- Add abstractions when they reduce duplicated meaning or clarify ownership.
- Use composition and small focused units as the default design shape.
- Give each module, function, and component one clear responsibility.
- Keep interfaces focused on what callers actually need.
- Depend on stable contracts at boundaries, not volatile implementation details.

## Consistency

- Follow existing project patterns for structure, naming, errors, logging, tests, and configuration.
- Extend established conventions before introducing new ones.
- Keep related code shaped the same way across the codebase.
- Update docs, rules, generated types, schemas, and tests when behavior or contracts change.
- Remove dead code, stale docs, unused branches, and accidental complexity while working in an area.

## Dependencies And Reuse

- Search the codebase for existing implementations before adding new code.
- Use established internal utilities and shared components for repeated behavior.
- Use well-maintained packages for standard problems such as parsing, validation, dates, auth, crypto, and protocol clients.
- Before adding or upgrading external dependencies (packages, container images, GitHub Actions, Helm charts, runtimes, CLIs), verify the current stable version from an authoritative source and validate maintenance status and ecosystem fit.

## Failure Behavior

- Fail fast on invalid input, impossible states, missing configuration, and violated invariants.
- Use explicit errors for misconfiguration, invalid state, and data issues.
- Keep fallback behavior deliberate, observable, and tied to a real product requirement.
- Preserve enough context in errors for debugging while keeping user-facing messages safe.
- Keep state transitions explicit and observable.
- Handle partial failure deliberately with retry, compensation, degradation, or safe failure.

## Correctness And Safety

- Validate untrusted input at boundaries.
- Keep secrets and environment-specific credentials out of source code.
- Make operational changes reversible, observable, and scoped.
- Treat security, privacy, and data safety as baseline requirements.
- Use least privilege for credentials, permissions, tokens, services, and infrastructure.

## Comments And Documentation

- Use names and structure to make ordinary code self-explanatory.
- Use comments only for why: non-obvious constraints, tradeoffs, product rules, operational reasons, and edge cases.
- Keep comments short: one line preferred, two lines maximum.
- Write comments for future maintainers and colleagues reading the code later.
- Write comments as durable context, not as messages to the user or reviewer.
- Phrase comments around stable product, operational, or technical context.
- Keep change history in git history, commit messages, pull requests, and changelogs.
- Keep code comments focused on information a maintainer cannot infer from the code itself.
- Use a comment when deleting it would force the reader to inspect git history or ask a teammate.
- Keep public docs and agent-facing project instructions aligned with the code.

## Verification

- Run the smallest relevant verification first, then broaden based on risk.
- Add or update tests for changed behavior, bug fixes, and regression-prone paths.
- Keep tests deterministic and behavior-focused.
- Treat type checks, lint, formatting, tests, and CI as quality gates.
- Report verification commands and results when finishing implementation work.
