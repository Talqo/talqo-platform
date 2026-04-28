# PagePal

PagePal is a white-label AI chat platform. Businesses (clients) embed a lightweight chat widget on their website and configure a bot through a dashboard. End users interact with the bot in real time; the platform handles AI orchestration, usage tracking, and multi-tenant isolation.

## Key concepts

| Actor | Role |
|-------|------|
| **End user** | Customer on a client's website who chats with the widget |
| **Client / Tenant** | Business that registers, configures the bot, and embeds the widget |
| **Platform admin** | Internal operator managing clients via a back-office |

## Documentation

- [Requirements](./requirements.md) — functional and non-functional requirements, actors, and out-of-scope items
- [Data model (ERD)](./architecture/ERD/main-mermaid.md) — entity-relationship diagram for the main database
- [Request flow](./architecture/component-diagram/enduser-request.md) — component diagram showing how an end-user message is processed
- [Deployment](./deployment.md) — local dev setup, cluster access, and release workflow
- [Widget: embed snippet](./widget/EMBED_SNIPPET.md) — HTML snippet for customers embedding the widget
- [Widget: CORS and hosting](./widget/CORS_SETUP.md) — hosting options and CORS configuration
