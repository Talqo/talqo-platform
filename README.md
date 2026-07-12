# Talqo

Talqo is the AI chat widget your website needs. It gives your site a branded AI assistant that answers visitor questions using the right business context — products, policies, bookings, docs, and connected tools.

Try the hosted instance: **[talqo.chat](https://talqo.chat)**

## How it works

Visitors land on your site and see a small chat bubble in the corner. They open it, type a question, and Talqo responds instantly using the context you've given it — your products, policies, docs, and any tools you've connected. The conversation stays available if they navigate around or reload the page, and they can rate the answer when they're done. You keep full control over what the bot knows, how it sounds, and how much it can say.

1. **Configure** — add your product data, policies, docs, tools, brand colors, and support rules.
2. **Embed** — paste the generated widget snippet onto your website.
3. **Launch** — save the page. The widget appears and is ready for visitors.

## Use cases

Talqo adapts to whatever your visitors ask — the use cases are as open-ended as your business. A few examples:

- **Shop** — "Where is my order?" → the bot checks status and replies with the delivery estimate.
- **SaaS** — "How do I connect the API?" → the bot walks the visitor through the setup path from your docs.
- **Services** — "Can I book Tuesday?" → the bot reads available slots and confirms the booking.

## What it does

**Connect sources. Match your site. Stay in control.**

- **Any website** — embeds via a single script tag, framework-agnostic, no host dependency
- **RAG knowledge base** — upload documents for the bot to reference, with a configurable embedding model
- **MCP tools** — connect a custom MCP server so the bot can reach structured data and take actions
- **Brand colors & custom personality** — system prompt, bot role, tone, word blacklist, accent color, bot avatar, widget position, light/dark mode
- **BYOK** — bring your own LLM provider (OpenAI, Anthropic, Google, OpenAI-compatible) or use the platform default

**The widget (what your visitors see)**

- A chat bubble visitors open from any page; works on desktop and mobile, from ~320px wide
- Instant streamed replies, formatted with markdown — the bot shows a typing indicator while it thinks
- Conversation history is saved and survives page reloads and navigation, so visitors don't repeat themselves
- Visitors can minimize the widget, start a fresh conversation, and rate the answer with a thumbs up/down
- Light and dark mode that follows the visitor's system preference
- Stays on topic: refuses harmful advice, won't promote competing products, and respects your word blacklist
- Rate-limited per IP and capped per conversation to prevent abuse

**Dashboard**

- Account management with password reset, account deletion, and widget token rotation
- View real end-user conversations to see how the widget is serving your customers
- Usage analytics: token consumption, question volume, engagement, satisfaction
- Budget controls: monthly spend limit, threshold email alerts
- Localized UI (English, Czech, Chinese)

**Back-office** (for operators running a hosted instance)

- Client list with status, suspend/re-enable, and impersonation with full audit logging
- Platform-wide analytics and aggregated satisfaction metrics
- Manage pre-made MCP server configurations

## Tech stack

| Layer | Stack |
|-------|-------|
| Runtime | Bun, Turborepo monorepo |
| API | Hono, Drizzle ORM, Zod, Vercel AI SDK, JWT (jose), Resend |
| Web | React 19, Vite, TanStack Router & Query, shadcn/ui, Tailwind CSS v4, react-i18next |
| Widget | Standalone IIFE bundle (React + CSS bundled in, no host dependency) |
| Database | PostgreSQL 18 with pgvector |
| Object storage | MinIO / any S3-compatible service |
| LLM providers | OpenAI, Anthropic, Google, OpenAI-compatible |

## Repository structure

```
talqo/
├── apps/
│   ├── api/      # Hono REST API (Bun, Drizzle, Zod)
│   ├── web/      # Client + back-office SPA (Vite, React, shadcn/ui)
│   └── e2e/      # Playwright end-to-end tests
├── packages/
│   ├── db/       # Drizzle schema, migrations, client
│   ├── shared/   # Shared Zod schemas and TS types
│   └── widget/   # Embeddable chat widget (IIFE bundle)
├── helm/         # Helm chart for Kubernetes deployment
├── k8s/          # Namespace manifests
└── docs/         # Architecture, ERD, deployment, widget guides
```

## Self-hosting

### Prerequisites

- [Bun](https://bun.sh) >= 1.3, [Docker](https://docs.docker.com/get-docker/)
- An LLM provider API key (OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint)
- For production: a Kubernetes cluster, [Helm 3](https://helm.sh/), an ingress controller, and cert-manager

### Local (Docker Compose)

PostgreSQL (pgvector) and MinIO run in Docker; the API and web app run on the host.

```bash
make setup   # creates .env, installs deps, builds packages
make dev     # starts PostgreSQL + API + web
```

Configure environment in `.env` (copy from `.env.example`). Required values: `JWT_SECRET`, `PROVIDER_KEY_SECRET`, and either a default LLM provider or per-client provider keys.

### Kubernetes (Helm)

A Helm chart deploys the API, web, PostgreSQL, and MinIO with an nginx ingress and Let's Encrypt TLS.

```bash
make helm-deps                 # first run only — pull chart dependencies
make push                      # build and push images to a registry
make deploy                    # helm upgrade --install
```

Container images are published to `ghcr.io/talqo/talqo-api` and `ghcr.io/talqo/talqo-web`. Override the registry, hosts, and secrets in `helm/values.yaml` (see `docs/deployment.md` for the full guide).

## Development

```bash
make setup       # env + deps + package builds
make dev         # API, web, and DB log panel
make test        # unit tests
make test:integration   # integration tests (requires DB)
make e2e         # Playwright suite
bun run type-check && bun run fix
```

## Documentation

- [Requirements](docs/requirements.md) — functional and non-functional spec
- [Data model (ERD)](docs/architecture/ERD/main-mermaid.md)
- [Request flow](docs/architecture/component-diagram/enduser-request.md)
- [Deployment](docs/deployment.md) — local dev, cluster access, releases
- [Widget embed snippet](docs/widget/EMBED_SNIPPET.md)
- [Widget CORS and hosting](docs/widget/CORS_SETUP.md)

## License

Source-available under the [Sustainable Use License 1.0](LICENSE.md). You may use, modify, and self-host the software for your own internal business, personal, or non-commercial purposes. Commercial redistribution or offering it as a hosted service to others is not permitted. See `LICENSE.md` for full terms.
