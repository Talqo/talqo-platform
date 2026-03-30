# Deployment

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) configured against the target cluster
- [Helm 3](https://helm.sh/docs/intro/install/)
- GHCR write access:
  ```bash
  echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin
  ```

## Environments

| Environment | Namespace       | Branch       | Image tag            |
|-------------|-----------------|--------------|----------------------|
| dev         | `pagepal-dev2`  | push to `dev`       | `sha-<short-commit>` |
| prod        | `pagepal-prod`  | semver tag `v*.*.*` | `MAJOR.MINOR.PATCH`  |

The active environment is detected from the current git branch — no flags needed.

## Local development

```bash
make setup   # install deps + start PostgreSQL in Docker
make dev     # start API, web, and DB log panel via Turborepo TUI
```

## Cluster access (kubeconfig)

Download the kubeconfig from the [e-infra.cz Rancher dashboard](https://rancher.cloud.e-infra.cz) — top-right menu → **Download KubeConfig**.

Then point your tools at it for the session:

```bash
export KUBECONFIG=/path/to/downloaded-kubeconfig.yaml
kubectl get nodes   # verify access
```

To make it permanent, merge it into your default kubeconfig:

```bash
KUBECONFIG=~/.kube/config:/path/to/downloaded-kubeconfig.yaml \
  kubectl config view --flatten > /tmp/merged.yaml
mv /tmp/merged.yaml ~/.kube/config
```

## Deploying to the cluster

### First deploy only — pull Helm dependencies

```bash
make helm-deps
```

Re-run only when `helm/Chart.yaml` dependencies change.

### Dev deploy

From any non-main branch:

```bash
make push     # build + push ghcr.io/.../pagepal-{api,web}:sha-<commit>
make deploy   # helm upgrade --install → pagepal-dev
```

### Prod release

Run from your dev/feature branch when ready to ship:

```bash
make release VERSION=1.2.3
```

This merges the current branch to `main`, tags `v1.2.3`, and pushes. The CD pipeline picks up the tag and automatically builds, pushes, and deploys to `pagepal-prod` — no manual steps needed.

To deploy prod manually (e.g. from a local machine without CI):

```bash
git checkout main  # must be on the tagged commit
make push          # builds ghcr.io/.../pagepal-{api,web}:1.2.3
make deploy        # helm upgrade --install → pagepal-prod
```

Both `make push` and `make deploy` fail if there is no semver tag on HEAD, preventing accidental prod deploys without a version.
