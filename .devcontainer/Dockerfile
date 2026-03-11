FROM mcr.microsoft.com/devcontainers/base:ubuntu

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
 && rm -rf /var/lib/apt/lists/* \
 # Docker is installed by the DiD feature in devcontainer.json
 # Install bun
 && export BUN_INSTALL=/usr/local/bun \
 && curl -fsSL https://bun.sh/install | bash \
 && ln -sf /usr/local/bun/bin/bun /usr/local/bin/bun \
 && ln -sf /usr/local/bun/bin/bunx /usr/local/bin/bunx \
 && ln -sf /usr/local/bun/bin/bun /usr/local/bin/npm \
 && ln -sf /usr/local/bun/bin/bunx /usr/local/bin/npx \
 # Install kubectl
 && curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt | xargs -I {} curl -fsSL -o /usr/local/bin/kubectl https://dl.k8s.io/release/{}/bin/linux/amd64/kubectl \
 && chmod +x /usr/local/bin/kubectl \
 # Install helm
 && curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash \
 # Install Claude Code
 && curl -fsSL https://claude.ai/install.sh | sudo -u vscode bash

USER vscode
