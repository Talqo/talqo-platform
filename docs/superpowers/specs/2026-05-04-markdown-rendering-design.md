# Markdown Rendering — Design Spec

**Date:** 2026-05-04
**Branch:** SCRUM-115-markdown-rendering

---

## Problem

Assistant message content is rendered as plain text in both the widget and the backoffice chat viewer. AI responses frequently contain markdown (bold, headings, lists, code) that currently displays as raw syntax characters.

## Scope

Render markdown for **assistant messages only** in two surfaces:

1. **Widget** (`packages/widget`) — the embedded IIFE chat widget
2. **Backoffice chat viewer** (`apps/web`) — admin conversation inspector at `/backoffice/chats`

User messages remain plain text in both surfaces.

---

## Tech Stack

| Package | Purpose |
|---------|---------|
| `react-markdown` | React component that parses markdown strings into React elements |
| `remark-gfm` | GitHub Flavored Markdown: tables, strikethrough, task lists, autolinks |
| `remark-breaks` | Converts single newlines to `<br>` — preserves line-break intent from AI output |
| `@tailwindcss/typography` | Tailwind `prose` utilities (web app only) |

---

## Architecture

Two independent `MarkdownContent` components, one per package. No shared component — the widget uses custom `aiw-*` CSS while the web uses Tailwind `prose` utilities. Coupling them would require a mode-switching prop and make both worse.

### Widget — `packages/widget/src/primitives/WidgetMarkdownContent.tsx`

```tsx
import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

type WidgetMarkdownContentProps = { content: string }

export function WidgetMarkdownContent({ content }: WidgetMarkdownContentProps) {
  return (
    <div className="aiw-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

Exported from `src/primitives/index.ts`.

**Integration:** `EmbeddedWidget.tsx` line 112–113 — replace `{msg.content}` with:
```tsx
{msg.role === "assistant" ? (
  <WidgetMarkdownContent content={msg.content} />
) : (
  msg.content
)}
```

### Web — `apps/web/src/components/backoffice/markdown-content.tsx`

```tsx
import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

type MarkdownContentProps = { content: string }

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

**Integration:** `backoffice.chats.tsx` `MessageBubble` — replace `<p className="whitespace-pre-wrap">{content}</p>` with:
```tsx
{isUser ? (
  <p className="whitespace-pre-wrap">{content}</p>
) : (
  <MarkdownContent content={content} />
)}
```

---

## Dependencies

### `packages/widget`
```sh
bun add react-markdown remark-gfm remark-breaks
```

### `apps/web`
```sh
bun add react-markdown remark-gfm remark-breaks @tailwindcss/typography
```

---

## Styling

### Widget CSS

Add `.aiw-markdown` ruleset to `packages/widget/src/theme/default.css`. Use `--widget-*` CSS variables so dark mode works automatically via the existing theming system. Cover: paragraphs, headings (h1–h3), bold, italic, inline code, code blocks, unordered/ordered lists, blockquotes.

### Web Tailwind

Add to `apps/web/src/index.css`:
```css
@plugin "@tailwindcss/typography";
```

`prose prose-sm dark:prose-invert max-w-none` on the wrapper handles all typography. `max-w-none` overrides the plugin's default max-width cap so content fills the message bubble.

---

## Security

`react-markdown` renders to React elements — no `innerHTML` is used. Raw HTML in AI output is not executed (no `rehype-raw` plugin). XSS-safe without `dompurify`. The existing `isomorphic-dompurify` dep in the widget is unaffected.

---

## Bundle Impact

`react-markdown` + `remark-gfm` + `remark-breaks` add ~35 KB (minified, pre-gzip) to the widget IIFE bundle. The widget already bundles React (~130 KB). Acceptable.

---

## Requirements Mapping

No dedicated requirement ID exists for markdown rendering. This enhances:
- **FR-1.1** — widget displays AI-generated responses
- **FR-2.21** — admin views end-user conversations

Update `docs/requirements.md` after implementation to reflect the enhancement under FR-1.1 and FR-2.21.

---

## Out of Scope

- Syntax highlighting for code blocks (no `rehype-highlight` / `prism`)
- Markdown rendering in user messages
- Shared markdown component in `packages/shared`
- Widget markdown in the backoffice preview (the backoffice uses its own `MessageBubble`, not the widget IIFE)
