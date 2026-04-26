SHELL := /bin/sh
.DEFAULT_GOAL := help

# Configuration
COMPOSE := docker compose
HELM_RELEASE := pagepal
HELM_CHART := ./helm
GHCR_USER := pagepal-agent
API_IMAGE := ghcr.io/$(GHCR_USER)/pagepal-api
WEB_IMAGE := ghcr.io/$(GHCR_USER)/pagepal-web
VITE_API_URL ?= http://localhost:3000
E2E_PORT     ?= 4173
# Rancher project ID — namespaces must be annotated with this to appear in the right project
RANCHER_PROJECT_ID := c-m-qvndqhf6:p-8rjpv

# Branch-based environment detection
# git branch --show-current returns empty in detached HEAD (e.g. CI checkouts); fall back to "detached"
BRANCH := $(shell b=$$(git branch --show-current 2>/dev/null); echo $${b:-detached})
ifeq ($(BRANCH),main)
  ENV := prod
  NAMESPACE := pagepal-prod
  HELM_VALUES :=
else ifeq ($(BRANCH),detached)
  # Detached HEAD in CI: treat as prod (release tags are checked out this way)
  ENV := prod
  NAMESPACE := pagepal-prod
  HELM_VALUES :=
else
  ENV := dev
  NAMESPACE := pagepal-dev
  HELM_VALUES := -f $(HELM_CHART)/values.dev.yaml
endif

# Image tagging strategy:
#   prod — MAJOR.MINOR.PATCH stripped from a vX.Y.Z git tag on HEAD
#           release gesture: make release VERSION=x.y.z
#   dev  — sha-<short-commit>: unique and traceable, no manual tagging needed
GIT_SHA := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
GIT_TAG := $(shell git tag --points-at HEAD 2>/dev/null \
             | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$$' | head -1 | sed 's/^v//')
ifeq ($(ENV),prod)
  IMAGE_TAG := $(GIT_TAG)
else
  IMAGE_TAG := sha-$(GIT_SHA)
endif

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Local Development ──────────────────────────────
.PHONY: setup
setup: ## Install deps, start database, run migrations and seed
	bun install
	$(COMPOSE) --env-file=.env.example up -d db --wait
	cd apps/api && bun run db:migrate
	cd apps/api && bun run db:seed
	@echo "Setup complete. Run 'make dev' to start development."

.PHONY: dev
dev: db-up ## Start local development (DB + apps)
	bun run dev

.PHONY: dev-api
dev-api: db-up ## Start API only (with DB)
	bun run dev:api

.PHONY: dev-web
dev-web: ## Start web only
	bun run dev:web

.PHONY: db-up
db-up: ## Start PostgreSQL (waits until healthy)
	$(COMPOSE) --env-file=.env.example up -d db --wait

.PHONY: db-down
db-down: ## Stop database services
	$(COMPOSE) down

.PHONY: db-reset
db-reset: ## Reset database (destroy volume, recreate, migrate and seed)
	$(COMPOSE) down -v
	$(COMPOSE) --env-file=.env.example up -d db --wait
	cd apps/api && bun run db:migrate
	cd apps/api && bun run db:seed

.PHONY: db-migrate
db-migrate: ## Run Drizzle migrations
	cd apps/api && bun run db:migrate

.PHONY: db-seed
db-seed: ## Seed the database
	cd apps/api && bun run db:seed

.PHONY: db-studio
db-studio: ## Open Drizzle Studio
	cd apps/api && bun run db:studio

# ── Build ──────────────────────────────────────────
.PHONY: build-workspaces
build-workspaces: ## Build all Bun workspaces
	bun run build

.PHONY: _require-tag
_require-tag:
	@[ -n "$(IMAGE_TAG)" ] || { \
		echo "ERROR: prod build requires a semver git tag on HEAD."; \
		echo "  Run: make release VERSION=x.y.z"; \
		exit 1; \
	}

.PHONY: _require-resend-api-key
_require-resend-api-key:
	@[ -n "$$RESEND_API_KEY" ] || { \
		echo "ERROR: RESEND_API_KEY env var is required for deployment."; \
		exit 1; \
	}

.PHONY: _require-default-llm
_require-default-llm:
	@[ -n "$$DEFAULT_LLM_PROVIDER_TYPE" ] && [ -n "$$DEFAULT_LLM_API_KEY" ] && [ -n "$$DEFAULT_LLM_MODEL" ] || { \
		echo "ERROR: DEFAULT_LLM_PROVIDER_TYPE, DEFAULT_LLM_API_KEY, and DEFAULT_LLM_MODEL are required."; \
		exit 1; \
	}

.PHONY: build-api
build-api: _require-tag ## Build API Docker image
	docker build -f apps/api/Dockerfile -t "$(API_IMAGE):$(IMAGE_TAG)" .

.PHONY: build-web
build-web: _require-tag ## Build Web Docker image
	docker build -f apps/web/Dockerfile \
		--build-arg VITE_API_URL="$(VITE_API_URL)" \
		-t "$(WEB_IMAGE):$(IMAGE_TAG)" .

.PHONY: build-images
build-images: build-api build-web ## Build all Docker images

.PHONY: build
build: build-workspaces build-images ## Build Bun workspaces and all Docker images

.PHONY: push-api
push-api: build-api ## Build and push API Docker image
	docker push "$(API_IMAGE):$(IMAGE_TAG)"

.PHONY: push-web
push-web: build-web ## Build and push Web Docker image
	docker push "$(WEB_IMAGE):$(IMAGE_TAG)"

.PHONY: push
push: push-api push-web ## Build and push all Docker images

# ── Test / Lint ────────────────────────────────────
.PHONY: test
test: ## Run all unit tests (excludes e2e tests)
	bun run test

.PHONY: e2e
e2e: db-up ## Run e2e tests (build, migrate, seed, start services, test, clean up)
	VITE_API_URL=$(VITE_API_URL) bunx turbo build --filter=web --filter=db
	bun --env-file=.env.example packages/db/migrate.ts
	bun --env-file=.env.example apps/api/src/db/seed.ts
	@PIDS=""; \
	APP_URL=http://localhost:$(E2E_PORT) bun --env-file=.env.example apps/api/src/index.ts & PIDS="$$!"; \
	(cd apps/web && bun run preview) & PIDS="$$PIDS $$!"; \
	timeout 60 sh -c 'until curl -sf http://localhost:3000/health >/dev/null 2>&1; do sleep 2; done' \
		|| { kill $$PIDS 2>/dev/null; echo "ERROR: API failed to start"; exit 1; }; \
	timeout 60 sh -c 'until curl -sf http://localhost:$(E2E_PORT) >/dev/null 2>&1; do sleep 2; done' \
		|| { kill $$PIDS 2>/dev/null; echo "ERROR: Web preview failed to start"; exit 1; }; \
	export BASE_URL=http://localhost:$(E2E_PORT); \
	cd apps/e2e && bun run test:run; STATUS=$$?; \
	[ -n "$$PIDS" ] && kill $$PIDS 2>/dev/null || true; \
	exit $$STATUS

.PHONY: lint
lint: ## Lint all workspaces
	bun run lint

# ── Release ────────────────────────────────────────
.PHONY: release
release: ## Merge to main, tag vVERSION, push (VERSION=x.y.z required)
	@[ -n "$(VERSION)" ] || { \
		echo "ERROR: VERSION is required.  Usage: make release VERSION=1.2.3"; exit 1; }
	@echo "$(VERSION)" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$' || { \
		echo "ERROR: VERSION must be MAJOR.MINOR.PATCH (got: $(VERSION))"; exit 1; }
	@[ "$(BRANCH)" != "main" ] || { \
		echo "ERROR: already on main — run from the branch you want to release."; exit 1; }
	@[ "$(BRANCH)" != "detached" ] || { \
		echo "ERROR: detached HEAD — checkout a branch first."; exit 1; }
	@[ -z "$$(git status --porcelain)" ] || { \
		echo "ERROR: working tree is dirty — commit or stash changes first."; exit 1; }
	@saved_branch="$(BRANCH)"; \
	trap 'git checkout "$$saved_branch"' EXIT; \
	set -e; \
	git checkout main; \
	git pull --ff-only origin main; \
	git merge --no-ff "$$saved_branch" -m "chore: release v$(VERSION)"; \
	git tag "v$(VERSION)"; \
	git push origin main --tags

# ── Helm ───────────────────────────────────────────
.PHONY: ns-create
ns-create: ## Create/update namespace with Rancher project annotation and resource quotas (idempotent)
	NAMESPACE="$(NAMESPACE)" RANCHER_PROJECT_ID="$(RANCHER_PROJECT_ID)" \
		envsubst < k8s/namespace-$(ENV).yaml | kubectl apply -f -
	@echo "Waiting for Rancher RBAC to propagate..."
	@until kubectl auth can-i list configmaps -n "$(NAMESPACE)" >/dev/null 2>&1; do sleep 2; done

.PHONY: helm-deps
helm-deps: ## Update Helm chart dependencies
	helm dependency update "$(HELM_CHART)"

.PHONY: helm-lint
helm-lint: ## Lint Helm chart
	helm lint "$(HELM_CHART)"

.PHONY: deploy
deploy: ns-create helm-deps _require-tag _require-resend-api-key _require-default-llm ## Deploy to cluster (env based on git branch)
	@echo "Deploying $(IMAGE_TAG) to $(NAMESPACE) (branch: $(BRANCH), env: $(ENV))"
	@MINIO_PASS=$$(kubectl get secret "$(HELM_RELEASE)-minio" -n "$(NAMESPACE)" \
		-o jsonpath='{.data.rootPassword}' 2>/dev/null | base64 -d); \
	[ -n "$$MINIO_PASS" ] || MINIO_PASS=$$(openssl rand -base64 24 | tr -d '/+='); \
	helm upgrade --install "$(HELM_RELEASE)" "$(HELM_CHART)" \
		-n "$(NAMESPACE)" \
		$(HELM_VALUES) \
		--set api.image.tag="$(IMAGE_TAG)" \
		--set web.image.tag="$(IMAGE_TAG)" \
		--set migration.image.tag="$(IMAGE_TAG)" \
		--set minio.rootPassword="$$MINIO_PASS" \
		--set resend.apiKey="$$RESEND_API_KEY" \
		--set api.defaultLlm.providerType="$$DEFAULT_LLM_PROVIDER_TYPE" \
		--set api.defaultLlm.apiKey="$$DEFAULT_LLM_API_KEY" \
		--set api.defaultLlm.model="$$DEFAULT_LLM_MODEL" \
		--set api.defaultLlm.baseUrl="$$DEFAULT_LLM_BASE_URL"

.PHONY: undeploy
undeploy: ## Uninstall from cluster (env based on git branch)
	@echo "Removing from $(NAMESPACE) (branch: $(BRANCH), env: $(ENV))"
	helm uninstall "$(HELM_RELEASE)" -n "$(NAMESPACE)"

.PHONY: clean
clean: ## Remove build artifacts, Docker images, and local volumes
	rm -rf apps/api/dist apps/web/dist packages/shared/dist packages/widget/dist
	$(COMPOSE) down -v --remove-orphans
	docker rmi "$(API_IMAGE):$(IMAGE_TAG)" "$(WEB_IMAGE):$(IMAGE_TAG)" 2>/dev/null || true

# NOTE: Widget deployment via Makefile is commented out for now.
# The widget is served via GitHub raw URLs during development.
# Uncomment and modify if MinIO/S3 deployment is needed in the future.
#
# # ── Widget Deployment ───────────────────────────────
# WIDGET_BUCKET ?= widget-bucket
# MINIO_ALIAS ?= minio
# MINIO_ENDPOINT ?= http://localhost:9000
#
# .PHONY: deploy-widget
# deploy-widget: ## Deploy widget bundle to MinIO (requires MINIO_ACCESS_KEY and MINIO_SECRET_KEY)
#	@[ -n "$(MINIO_ACCESS_KEY)" ] || { echo "ERROR: MINIO_ACCESS_KEY is required"; exit 1; }
#	@[ -n "$(MINIO_SECRET_KEY)" ] || { echo "ERROR: MINIO_SECRET_KEY is required"; exit 1; }
#	mc alias set $(MINIO_ALIAS) $(MINIO_ENDPOINT) $(MINIO_ACCESS_KEY) $(MINIO_SECRET_KEY) 2>/dev/null || true
#	mc mb $(MINIO_ALIAS)/$(WIDGET_BUCKET) 2>/dev/null || true
#	mc cp packages/widget/dist/widget-bundle.js $(MINIO_ALIAS)/$(WIDGET_BUCKET)/
#	@echo "Widget deployed to $(MINIO_ENDPOINT)/$(WIDGET_BUCKET)/widget-bundle.js"
