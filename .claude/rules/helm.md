---
paths: 
  - "**/helm/**"
---
## Context

Apply these rules when creating or modifying Helm charts. Focus on naming conventions, security, and proper templating.

## Best Practices

### Naming

**Chart Names:**

- Pattern: `lowercase-with-hyphens`
- Only `[a-z0-9-]`, start with letter
- Directory name must match chart name
- Examples: `nginx-ingress`, `cert-manager`

**Values:**

- Pattern: `camelCase`
- Examples: `replicaCount`, `serviceAccountName`

**Versioning:**

- SemVer 2 format: `1.2.3`
- `version`: Chart version
- `appVersion`: Application version (quoted)

### Templating

**Namespace template names:**

```yaml
# ✅ Correct
{{- define "chartname.fullname" }}
{{- .Release.Name }}-{{ .Chart.Name }}
{{- end }}

# ❌ Causes conflicts
{{- define "fullname" }}...{{- end }}
```

**Input validation:**

```yaml
# Mandatory values
name: {{ required "serviceName is required" .Values.serviceName }}

# Optional with default
replicas: {{ .Values.replicaCount | default 1 }}

# Safe string handling
value: {{ .Values.dbHost | quote }}
```

### Values

**Type safety:**

```yaml
# ✅ Correct - quote strings and versions
image:
  tag: "1.2.3"
  pullPolicy: "IfNotPresent"
port: 8080
enabled: false  # Booleans: no quotes
```

**Documentation:**

```yaml
# replicaCount is the number of pod replicas
replicaCount: 3
```

**Prefer flat over nested** (easier `--set` overrides):

```yaml
# ✅ Good
serverHost: "example.com"
serverPort: 8080

# ❌ Avoid
server:
  config:
    host: "example.com"
```

### Security

**Secrets:**

```yaml
{{- if not (lookup "v1" "Secret" .Release.Namespace "app-secret") }}
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
  annotations:
    "helm.sh/resource-policy": "keep"
stringData:
  password: {{ randAlphaNum 32 }}
{{- end }}
```

**Security Context (required defaults):**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

**RBAC:** Use least-privilege; avoid `cluster-admin` and `*` verbs.

### Resources

```yaml
resources:
  limits:
    cpu: {{ .Values.resources.limits.cpu | default "500m" }}
    memory: {{ .Values.resources.limits.memory | default "512Mi" }}
  requests:
    cpu: {{ .Values.resources.requests.cpu | default "100m" }}
    memory: {{ .Values.resources.requests.memory | default "128Mi" }}

livenessProbe:
  httpGet:
    path: {{ .Values.livenessProbe.path | default "/health" }}
    port: http
  initialDelaySeconds: 30

readinessProbe:
  httpGet:
    path: {{ .Values.readinessProbe.path | default "/ready" }}
    port: http
  initialDelaySeconds: 5
```

### Validation

```bash
helm lint ./mychart
helm template ./mychart --debug
helm install --dry-run --debug test ./mychart
helm test <release-name>
```

## Boundaries

- ✅ **Always:** Use `lowercase-with-hyphens` for chart names
- ✅ **Always:** Use `camelCase` for values
- ✅ **Always:** Quote all strings in values.yaml (exception: numeric fields such as ports, replica counts, and resource quantities must be unquoted integers)
- ✅ **Always:** Namespace template names with chart prefix
- ✅ **Always:** Include resource limits and health checks
- ✅ **Always:** Document every value with comments
- ✅ **Always:** Use `required` for mandatory values
- ⚠️ **Ask:** Before using `cluster-admin` RBAC
- 🚫 **Never:** Hardcode secrets in values or templates
- 🚫 **Never:** Provide default passwords
- 🚫 **Never:** Run containers as root
- 🚫 **Never:** Use overly permissive RBAC (`*` verbs)
