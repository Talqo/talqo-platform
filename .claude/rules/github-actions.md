---
paths: 
  - "**/.github/workflows/*.yml"
  - "**/.github/workflows/*.yaml"
---
## Context

Guidelines for building reliable GitHub Actions workflows with proper security, caching, testing, and deployment strategies.

## Best Practices

### Workflow Structure

- Descriptive `name` and specific triggers (`on: push`, `pull_request`, `workflow_dispatch`)
- `concurrency` to prevent race conditions
- `permissions` with least privilege (default `contents: read`)
- `workflow_call` for reusable workflows

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact_path: ${{ steps.package.outputs.path }}
    steps:
      - uses: actions/checkout@v6
      - id: package
        run: echo "path=dist.zip" >> "$GITHUB_OUTPUT"
      - uses: actions/upload-artifact@v7
        with:
          name: build-artifact
          path: ${{ steps.package.outputs.path }}
  
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/download-artifact@v7
        with:
          name: build-artifact
          path: dist
```

### Security

**Permissions:**

```yaml
permissions:
  contents: read
  pull-requests: write  # Only if needed
```

**Secrets:**

- Store sensitive data in GitHub Secrets (`${{ secrets.SECRET_NAME }}`)
- Use environment-specific secrets with approval gates
- Never print secrets to logs

**OIDC:**

- Prefer OIDC over long-lived credentials for cloud auth (AWS, Azure, GCP)

### Optimization

**Caching:**

```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
- uses: actions/cache@v5
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
    restore-keys: ${{ runner.os }}-bun-
```

**Matrix:**

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    bun-version: [1.x]
```

**Checkout:**

- `fetch-depth: 1` for shallow clones (most builds)
- `fetch-depth: 0` only when full history needed

### Testing

**Services:**

```yaml
services:
  postgres:
    image: postgres:18
    env:
      POSTGRES_PASSWORD: test
```

- Unit tests on every push/PR
- Integration tests with `services` for databases
- E2E tests with Playwright/Cypress against staging
- Publish results as GitHub Checks

### Deployment

**Environments:**

```yaml
environment:
  name: production
  url: https://prod.example.com
```

**Strategies:**

- **Rolling:** Gradual replacement (default)
- **Blue/Green:** Instant traffic switch, easy rollback
- **Canary:** 5-10% rollout first, monitor before full deploy

### Troubleshooting

- **Not triggering:** Check `on` triggers, `branches`/`paths` filters
- **Permission errors:** Set `permissions` explicitly, verify secrets scope
- **Cache issues:** Use `hashFiles()` in key, add `restore-keys`
- **Slow workflows:** Parallelize with matrix, use caching, combine commands with `&&`

## Boundaries

- ✅ **Always:** Pin actions to a specific major version tag or commit SHA (never `@main` or `@latest`)
- ✅ **Always:** Set `permissions: contents: read` by default
- ✅ **Always:** Use `${{ secrets.NAME }}` for sensitive data
- ✅ **Always:** Use `fetch-depth: 1` for checkout unless full history is required (e.g., semantic-release, conventional-changelog, `git describe`)
- ✅ **Always:** Use `hashFiles()` for cache keys
- ⚠️ **Ask:** Before adding self-hosted runners
- ⚠️ **Ask:** Before adding new workflow triggers
- 🚫 **Never:** Hardcode secrets in workflow files
- 🚫 **Never:** Use `@main` or `@latest` for action versions
- 🚫 **Never:** Print secrets to logs
