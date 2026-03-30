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

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-1.1 | End user can send text messages to the bot and receive AI-generated responses | High | Approved |
| FR-1.2 | Conversation history is persisted in the end user's browser so the context survives page reloads | High | Approved |
| FR-1.3 | Widget can be minimised and reopened without losing the conversation state | High | Approved |
| FR-1.4 | Widget displays a typing indicator while the bot is generating a response | High | Approved |
| FR-1.5 | End user can clear / reset the current conversation | Low | Draft |
| FR-1.6 | End user can rate their satisfaction at the end of a conversation (e.g. thumbs up/down or star rating) | Low | Draft |

### FR-2: Client Dashboard

> The web application where a client configures their bot and monitors usage.

#### FR-2a: Account management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.1 | Client can register a new account | High | Approved |
| FR-2.2 | Client can log in and log out of the dashboard | High | Approved |
| FR-2.3 | Client can use an npm-published React component to place the widget on their website | High | Draft |
| FR-2.4 | Client can reset their password via a link sent to their registered email address | High | Draft |
| FR-2.5 | Client can permanently delete their account and all associated data | Medium | Draft |

#### FR-2b: API configuration

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.6 | Client can use platform's default API endpoint | High | Approved |
| FR-2.7 | Client can configure a custom API endpoint and API key | Medium | Approved |

#### FR-2c: Usage and billing

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.8 | Client can add funds to their account | Medium | Approved |
| FR-2.9 | Client can set a monthly limit (in USD) for API usage | Low | Approved |
| FR-2.10 | Client can configure email notifications when a usage threshold is reached | Low | Approved |

#### FR-2d: Bot configuration

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.11 | Client can set a system prompt / context that scopes the bot's knowledge to their domain | High | Approved |
| FR-2.12 | Client can assign a default role to the bot (e.g. "customer support agent for Acme Shop") | High | Approved |
| FR-2.13 | Client can customise the bot's tone and communication style (e.g. formal / informal address) | Medium | Approved |
| FR-2.14 | Client can maintain a word blacklist; the bot must not use or engage with blacklisted terms | Medium | Approved |
| FR-2.15 | Client can toggle whether the bot is allowed to search the internet for answers | Medium | Approved |

#### FR-2e: Knowledge & integrations (MCP)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.16 | Client can connect their own MCP server to give the bot access to structured data | High | Approved |
| FR-2.17 | Client can register a custom MCP endpoint URL to connect proprietary data sources | Low | Approved |

#### FR-2f: Analytics & appearance

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.18 | Dashboard displays graphs of token consumption over time | Medium | Approved |
| FR-2.19 | Dashboard displays the total number of end-user questions over time | Medium | Approved |
| FR-2.20 | Dashboard supports light and dark mode | High | Approved |

### FR-3: Back-office

> The internal tool used by platform admins to manage tenants and platform health.

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-3.1 | Platform admin can view a list of all clients with key status indicators (token consumption, API key type, active/suspended) | High | Approved |
| FR-3.2 | Platform admin can suspend or re-enable a client account | Medium | Approved |
| FR-3.3 | Platform admin can impersonate / access a client's dashboard for support purposes | High | Approved |
| FR-3.4 | Platform admin receives alerts when a downstream service (OpenAI API, MCP connector) is experiencing an outage | Low | Approved |
| FR-3.5 | Platform admin can view platform-wide usage aggregates (total tokens, active tenants, error rates) | Low | Approved |

---

## Non-Functional Requirements

### NFR-1: Architecture

| ID | Requirement | Notes | Priority |
|----|-------------|-------|----------|
| NFR-1.1 | The widget must be implemented as a self-contained React component publishable as an npm package | Enables easy integration into existing React projects using standard package managers (npm/yarn/pnpm) | High |
| NFR-1.2 | The widget component allows for visual customization (accent colour, bot avatar, widget position) | | Medium |
| NFR-1.3 | Client documentation (integration guide, configuration reference) must be provided | Markdown or hosted docs | High |

### NFR-2: Safety & Content Policy

| ID | Requirement | Notes | Priority |
|----|-------------|-------|----------|
| NFR-2.1 | The bot must refuse requests that could cause real-world harm (e.g. harmful advice, PII extraction) | Enforced via system prompt guardrails | Low |
| NFR-2.2 | The bot must not recommend or promote competing products or services | Enforced via system prompt + blacklist | High |
| NFR-2.3 | Client-defined word blacklist violations must be filtered before the response is sent to the end user | | High |

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
- Multi-language UI localisation (beyond what the client configures via system prompt)
- Payment processing integration (subscription billing is assumed to be handled externally)

---

## Bonus / Sidequest

| ID | Description | Notes |
|----|-------------|-------|
| BNS-1 | Human support fallback — end user can escalate from the bot to a human agent; client staff receive and respond to tickets in a separate support inbox | Relevant when end user complains about bot quality or request is too complex for AI |
