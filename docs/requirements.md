# Requirements

## Actors

| Actor | Description |
|-------|-------------|
| **End user** | The client's customer who interacts with the widget on the client's website |
| **Client** / **Tenant** | A business that registers on the platform, configures the bot, and embeds the widget |
| **Platform admin** | Our team member managing clients via the back-office |

---

## Functional Requirements

### FR-1: Widget

> The embeddable chat widget rendered on the client's website for end users.

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-1.1 | End user can send text messages to the bot and receive AI-generated responses (rendered as markdown) | High | Approved | Done |
| FR-1.2 | Conversation history is persisted server-side and survives page reloads via browser session ID | High | Approved | Done |
| FR-1.3 | Widget can be minimised and reopened without losing the conversation state | High | Approved | Done |
| FR-1.4 | Widget displays a typing indicator while the bot is generating a response | High | Approved | Done |
| FR-1.5 | End user can clear / reset the current conversation | Low | Approved | Done |
| FR-1.6 | End user can rate their satisfaction at the end of a conversation (e.g. thumbs up/down or star rating) | Low | Approved | Done |
| FR-1.7 | Widget enforces IP-based hourly rate limiting to prevent abuse | High | Approved | Done |
| FR-1.8 | Widget enforces a per-conversation message limit before requiring a new conversation | High | Approved | Done |

### FR-2: Client Dashboard

> The web application where a client configures their bot and monitors usage.

#### FR-2a: Account management

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-2.1 | Client can register a new account | High | Approved | Done |
| FR-2.2 | Client can log in and log out of the dashboard | High | Approved | Done |
| FR-2.3 | Client can embed the widget on their website via a script tag or iframe (no framework dependency required) | High | Approved | Done |
| FR-2.4 | Client can reset their password via a link sent to their registered email address | High | Approved | Done |
| FR-2.5 | Client can permanently delete their account and all associated data | Medium | Approved | Done |
| FR-2.5a | Client can rotate the widget token to invalidate the old embed code | Medium | Approved | Done |

#### FR-2b: API configuration

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-2.6 | Client can use platform's default API endpoint | High | Approved | Done |
| FR-2.7 | Client can configure a custom API endpoint and API key | Medium | Approved | Done |

#### FR-2c: Usage and billing

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-2.8 | Client can add funds to their account | Medium | Approved | Done |
| FR-2.9 | Client can set a monthly limit (in USD) for API usage | Low | Approved | Done |
| FR-2.10 | Client can configure email notifications when a usage threshold is reached | Low | Approved | Done |

#### FR-2d: Bot configuration

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-2.11 | Client can set a system prompt / context that scopes the bot's knowledge to their domain | High | Approved | In progress |
| FR-2.12 | Client can assign a default role to the bot (e.g. "customer support agent for Acme Shop") | High | Approved | In progress |
| FR-2.13 | Client can customise the bot's tone and communication style (e.g. formal / informal address) | Medium | Approved | In progress |
| FR-2.14 | Client can maintain a word blacklist; the bot must not use or engage with blacklisted terms | Medium | Approved | In progress |

#### FR-2e: Knowledge & integrations (MCP)

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-2.16 | Client can connect their own MCP server to give the bot access to structured data | High | Approved | Done |
| FR-2.17 | Client can register a custom MCP endpoint URL to connect proprietary data sources | Low | Approved | Done |

#### FR-2f: Analytics & appearance

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-2.18 | Dashboard displays graphs of token consumption over time | Medium | Approved | Done |
| FR-2.19 | Dashboard displays the total number of end-user questions over time | Medium | Approved | Done |
| FR-2.20 | Dashboard supports light and dark mode | High | Approved | Done |
| FR-2.21 | Client can view end-user conversations to assess how the widget is serving their customers | High | Approved | Done |
| FR-2.22 | Dashboard displays a breakdown of conversation categories (e.g. product inquiries, order issues, returns, general FAQ) | Low | Approved | Not started |
| FR-2.23 | Dashboard displays conversion metrics | Low | Approved | Out of scope |
| FR-2.24 | Dashboard displays satisfaction rating analytics | Low | Approved | Done |
| FR-2.25 | Dashboard displays general engagement metrics (total conversations, unique chat users, percentage of site visitors who used the chatbot) | Low | Approved | Done |

### FR-3: Back-office

> The internal tool used by platform admins to manage tenants and platform health.

| ID | Requirement | Priority | Status | Completion |
|----|-------------|----------|--------|------------|
| FR-3.1 | Platform admin can view a list of all clients with key status indicators (token consumption, API key type, active/suspended) | High | Approved | Done |
| FR-3.2 | Platform admin can suspend or re-enable a client account | Medium | Approved | Done |
| FR-3.3 | Platform admin can impersonate / access a client's dashboard for support purposes | High | Approved | In progress |
| FR-3.4 | Platform admin receives alerts when a downstream service (OpenAI API, MCP connector) is experiencing an outage | Low | Approved | Not started |
| FR-3.4.1 | Platform admin can view a log of impersonate, suspend, and re-enable actions in the back-office | Medium | Approved | Done |
| FR-3.5.1 | Platform admin can view total registered client count | Low | Approved | Done |
| FR-3.5.2 | Platform admin can view the number of active tenants (clients with at least one conversation in the past 30 days) | Low | Approved | Done |
| FR-3.5.3 | Platform admin can view platform-wide error rates (percentage of failed API and MCP requests) | Low | Approved | Not started |
| FR-3.6 | Platform admin can view a graph of official (platform) API key usage over time | Low | Approved | Done |
| FR-3.7 | Platform admin can view a graph of total conversation count across all tenants over time | Low | Approved | Done |
| FR-3.8 | Platform admin can view aggregated end-user satisfaction ratings across all tenants | Low | Approved | Done |

---

## Non-Functional Requirements

### NFR-1: Architecture

| ID | Requirement | Notes | Priority | Completion |
|----|-------------|-------|----------|------------|
| NFR-1.1 | The widget must be deployable via a script tag or iframe so it can be embedded on any website, including static pages, without requiring a specific framework | Enables integration into any website regardless of tech stack | High | Done |
| NFR-1.2 | The widget component allows for visual customization (accent colour, bot avatar, widget position) | Managed in dashboard, fetched at runtime | Medium | Done |
| NFR-1.3 | Client documentation (integration guide, configuration reference) must be provided | Markdown or hosted docs | High | Not started |

### NFR-2: Safety & Content Policy

| ID | Requirement | Notes | Priority | Completion |
|----|-------------|-------|----------|------------|
| NFR-2.1 | The bot must refuse requests that could cause real-world harm (e.g. harmful advice, PII extraction) | Enforced via system prompt guardrails | Low | Done |
| NFR-2.2 | The bot must not recommend or promote competing products or services | Enforced via system prompt + blacklist | High | Done |
| NFR-2.3 | Client-defined word blacklist violations must be filtered before the response is sent to the end user | | High | Not started |
| NFR-2.4 | The bot must stay on-topic for the client's domain and refuse to help with unrelated tasks (e.g. homework, general trivia) | Enforced via system prompt guardrails | High | Done |

### NFR-3: Security

| ID | Requirement | Notes | Priority |
|----|-------------|-------|----------|
| NFR-3.1 | Client API keys must be stored encrypted at rest and never exposed to the frontend | | High |
| NFR-3.2 | All API endpoints must require authentication; widget endpoints are scoped to a per-client public token | | High |
| NFR-3.3 | Dashboard and back-office must use HTTPS | | High |
| NFR-3.4 | The system must log all platform admin access actions | Related to FR-3.3 | Medium |
| NFR-3.5 | The system should constrain custom MCP endpoints | Related to FR-2.17 | High |

### NFR-4: Performance

| ID | Requirement | Metric | Priority |
|----|-------------|--------|----------|
| NFR-4.1 | Widget first meaningful paint on the client's page | < 1 s on a broadband connection | Medium |
| NFR-4.2 | Bot first-token response latency (time to first streamed token) | < 3 s under normal load | Medium |

### NFR-5: Usability

| ID | Requirement | Notes | Priority |
|----|-------------|-------|----------|
| NFR-5.1 | Widget must be fully responsive and usable across all screen sizes, including mobile devices | Layout and interactions must work correctly from ~320 px upward | High |
| NFR-5.2 | Widget supports light and dark mode, respecting the client's configuration and/or the end user's system preference | | High |
| NFR-5.3 | Client dashboard must be usable on common desktop and tablet screen sizes | Minimum supported viewport: 768 px wide | Medium |
| NFR-5.4 | Back-office is a desktop-only tool; responsive design for mobile viewports is not required | Intended for internal use on desktop browsers only | Low |

---

## Out of Scope

- Real-time human handoff / live agent chat (listed as a bonus sidequest, not a core deliverable)
- Multi-language UI localisation (SCRUM-96) — English, Czech, Chinese. All frontend strings wired via `react-i18next`; language switcher available in auth header
- Payment processing integration (subscription billing is assumed to be handled externally)
- **FR-2.23 — Conversion metrics**: "Conversion" is undefined for a generic chat widget — whether a conversation led to a purchase, signup, or resolved ticket depends entirely on the client's own backend. Tracking it would require each client to send conversion events back to the platform via a webhook or JS SDK, which is infrastructure that was never scoped. Without a contract for what constitutes a conversion and a mechanism to receive that signal, the metric cannot be computed.

---

## Bonus / Sidequest

| ID | Description | Notes |
|----|-------------|-------|
| BNS-1 | Human support fallback — end user can escalate from the bot to a human agent; client staff receive and respond to tickets in a separate support inbox | Relevant when end user complains about bot quality or request is too complex for AI |
