{{/*
Expand the name of the chart.
*/}}
{{- define "talqo.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "talqo.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "talqo.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{ include "talqo.selectorLabels" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "talqo.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API selector labels
*/}}
{{- define "talqo.api.selectorLabels" -}}
{{ include "talqo.selectorLabels" . }}
app.kubernetes.io/name: {{ include "talqo.name" . }}-api
app.kubernetes.io/component: api
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "talqo.web.selectorLabels" -}}
{{ include "talqo.selectorLabels" . }}
app.kubernetes.io/name: {{ include "talqo.name" . }}-web
app.kubernetes.io/component: web
{{- end }}

{{/*
DB secret name — use the postgresql subchart's secret.
*/}}
{{- define "talqo.dbSecretName" -}}
{{- include "talqo.fullname" . }}-postgresql
{{- end }}

{{/*
MinIO secret name — uses existingSecret when provided, otherwise the official MinIO subchart default.
*/}}
{{- define "talqo.minioSecretName" -}}
{{- if .Values.minio.existingSecret }}
{{- .Values.minio.existingSecret }}
{{- else }}
{{- if not .Values.minio.rootPassword }}
{{- fail "minio.rootPassword must be set when existingSecret is not provided — pass --set minio.rootPassword=<password>" }}
{{- end }}
{{- include "talqo.fullname" . }}-minio
{{- end }}
{{- end }}

{{/*
JWT secret name — uses existingSecret when provided, otherwise the generated one.
*/}}
{{- define "talqo.jwtSecretName" -}}
{{- if .Values.jwt.existingSecret }}
{{- .Values.jwt.existingSecret }}
{{- else }}
{{- include "talqo.fullname" . }}-jwt-secret
{{- end }}
{{- end }}

{{/*
Resend secret name — uses existingSecret when provided, otherwise the generated one.
*/}}
{{- define "talqo.resendSecretName" -}}
{{- if .Values.resend.existingSecret }}
{{- .Values.resend.existingSecret }}
{{- else }}
{{- include "talqo.fullname" . }}-resend-secret
{{- end }}
{{- end }}

{{/*
Provider key secret name — uses existingSecret when provided, otherwise the generated one.
*/}}
{{- define "talqo.providerKeySecretName" -}}
{{- if .Values.providerKey.existingSecret }}
{{- .Values.providerKey.existingSecret }}
{{- else }}
{{- include "talqo.fullname" . }}-provider-key-secret
{{- end }}
{{- end }}

{{/*
Default LLM secret name — uses existingSecret when provided, otherwise the generated one.
*/}}
{{- define "talqo.defaultLlmSecretName" -}}
{{- if .Values.api.defaultLlm.existingSecret }}
{{- .Values.api.defaultLlm.existingSecret }}
{{- else }}
{{- include "talqo.fullname" . }}-default-llm-secret
{{- end }}
{{- end }}
