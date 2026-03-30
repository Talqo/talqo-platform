{{/*
Expand the name of the chart.
*/}}
{{- define "pagepal.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "pagepal.fullname" -}}
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
{{- define "pagepal.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{ include "pagepal.selectorLabels" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "pagepal.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API selector labels
*/}}
{{- define "pagepal.api.selectorLabels" -}}
{{ include "pagepal.selectorLabels" . }}
app.kubernetes.io/name: {{ include "pagepal.name" . }}-api
app.kubernetes.io/component: api
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "pagepal.web.selectorLabels" -}}
{{ include "pagepal.selectorLabels" . }}
app.kubernetes.io/name: {{ include "pagepal.name" . }}-web
app.kubernetes.io/component: web
{{- end }}

{{/*
DB secret name — uses existingSecret when provided, otherwise the generated one.
*/}}
{{- define "pagepal.dbSecretName" -}}
{{- if .Values.postgresql.auth.existingSecret }}
{{- .Values.postgresql.auth.existingSecret }}
{{- else }}
{{- include "pagepal.fullname" . }}-db-secret
{{- end }}
{{- end }}

{{/*
Database URL constructed from postgresql subchart values.
*/}}
{{- define "pagepal.databaseUrl" -}}
{{- $host := printf "%s-postgresql" (include "pagepal.fullname" .) }}
{{- $user := .Values.postgresql.auth.username }}
{{- $db := .Values.postgresql.auth.database }}
{{- printf "postgresql://%s:$(DATABASE_PASSWORD)@%s:5432/%s" $user $host $db }}
{{- end }}
