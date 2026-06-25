---
paths:
  - ".claude/rules/*.md"
---

# Rules File Standards

## Philosophy

- Capture engineering taste as reusable standards across projects.
- Favor current industry standards and strong defaults over project-by-project improvisation.
- Preserve strict consistency inside a project and useful consistency across projects.
- Keep rules opinionated when the opinion prevents low-quality, unsafe, or inconsistent code.
- Write preferred tools, patterns, conventions, and result shapes.
- Assume the agent already knows the technology syntax and concepts.
- Focus on choices that change implementation quality beyond generic syntax or framework knowledge.
- Include exact snippets only when they define a required convention or canonical project shape.

## Scope

- Path scoping is routing, not project specificity.
- Use narrow globs that apply technology-specific rules only to relevant files.

## Style

- Use concise sections and direct language.
- Use concrete technical language instead of vague agent-speak.
- Use contrast examples only when the contrast defines the standard.
