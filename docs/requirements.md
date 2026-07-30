# Requirements

## Actors

| Actor | Description |
|-------|-------------|
| **End user** | The client's website visitor who chats with the widget |
| **Operator** | The person who configures bots and embeds the widget via the dashboard |

---

## Functional Requirements

### FR-1: Widget

> The embeddable chat widget (`apps/widget`, `@talqo/widget`) rendered on the client's website.

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-1.1 | Widget mounts from a single script tag (`window.TalqoWidget.mount()`) | Done | IIFE bundle `dist/widget-bundle.js` |
| FR-1.2 | Trigger button opens/closes the chat panel | Done | |
| FR-1.3 | Messages render as chat bubbles (user end/primary, bot start/muted) | Done | shadcn `bubble` component |
| FR-1.4 | End user can type and send messages | Done (UI) | No bot backend yet |
| FR-1.5 | Bot replies with AI-generated responses | Planned | Needs bot API |
| FR-1.6 | Conversation survives page reloads | Planned | Needs session persistence |
| FR-1.7 | Appearance driven by CSS custom properties embeddable pages can't clobber | Done | Tokens scoped to `.talqo-widget`, no global preflight |
| FR-1.8 | Stylesheet exposed for hosts rendering the component themselves | Done | `@talqo/widget/style.css` export |

### FR-2: Operator dashboard

> The web application (`apps/web`) where an operator configures bots and the widget.

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-2.1 | Landing page with Get Started entry to `/dashboard` (no login gate) | Done | |
| FR-2.2 | Dashboard shell with navigation: Dashboard, Bots, Widget, Analytics, Account | Done | Responsive sidebar |
| FR-2.3 | Bot list with name, prompt, blacklist, active/paused status | Done (UI) | Mock data via `useWidgets` |
| FR-2.4 | Create-bot form: name, system prompt, comma-separated word blacklist | Done (UI) | Local state only |
| FR-2.5 | Embed code snippet per bot with copy button | Done | |
| FR-2.6 | Widget visual config: accent color, position, language, avatar URL, theme switch | Done (UI) | Accent, position + language live in preview; avatar URL and theme switch are control-only for now |
| FR-2.7 | Live + full-screen widget preview | Done | `/dashboard/widget`, `/widget-preview` |
| FR-2.8 | Per-widget analytics: conversations, messages, tokens over time | Done (UI) | Mock stats via `useWidgetStats` |
| FR-2.9 | Account page: profile form, change password with confirmation, delete account behind dialog | Done (UI) | Not persisted |
| FR-2.10 | Bots/forms backed by the API | Planned | Endpoints `/widgets`, `/widgets/:id/stats` |
| FR-2.11 | Authentication for dashboard access | Planned | |

---

## Status legend

- **Done** — implemented and verified in the current codebase.
- **Done (UI)** — full UI exists; data is mock/local because the API is out of scope for the current iteration.
- **Planned** — approved but not started.
