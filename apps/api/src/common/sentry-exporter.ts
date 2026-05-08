import * as Sentry from "@sentry/bun"
import type { EventExporter, WideEvent } from "./wide-event.types"

export class SentryExporter implements EventExporter {
	export(event: WideEvent): void {
		const attrs: Record<string, string | number | boolean | undefined> = {
			request_id: event.request_id,
			method: event.method,
			path: event.path,
			status_code: event.status_code,
			duration_ms: event.duration_ms,
			service: event.service,
			version: event.version,
			deployment_id: event.deployment_id,
			region: event.region,
		}

		if (event.auth) {
			attrs["auth.outcome"] = event.auth.outcome
		}
		if (event.client) {
			attrs["client.id"] = event.client.id
			attrs["client.status"] = event.client.status
			if (event.client.is_impersonated)
				attrs["client.is_impersonated"] = event.client.is_impersonated
		}
		if (event.admin) {
			attrs["admin.id"] = event.admin.id
			if (event.admin.target_client_id)
				attrs["admin.target_client_id"] = event.admin.target_client_id
			if (event.admin.action) attrs["admin.action"] = event.admin.action
		}
		if (event.widget) {
			if (event.widget.session_id)
				attrs["widget.session_id"] = event.widget.session_id
			if (event.widget.conversation_id)
				attrs["widget.conversation_id"] = event.widget.conversation_id
			if (event.widget.is_new_session !== undefined)
				attrs["widget.is_new_session"] = event.widget.is_new_session
		}
		if (event.ai) {
			attrs["ai.provider"] = event.ai.provider
			attrs["ai.model"] = event.ai.model
		}
		if (event.file) {
			if (event.file.path) attrs["file.path"] = event.file.path
			if (event.file.size_bytes)
				attrs["file.size_bytes"] = event.file.size_bytes
			if (event.file.from_path) attrs["file.from_path"] = event.file.from_path
			if (event.file.to_path) attrs["file.to_path"] = event.file.to_path
		}
		if (event.error) {
			attrs["error.type"] = event.error.type
			attrs["error.message"] = event.error.message
			if (event.error.code) attrs["error.code"] = event.error.code
			attrs["error.retriable"] = event.error.retriable
		}

		if (event.outcome === "error" && event._originalError instanceof Error) {
			Sentry.withScope((scope) => {
				scope.setTag("request_id", event.request_id)
				scope.setTag("method", event.method)
				scope.setTag("path", event.path)
				if (event.status_code !== undefined)
					scope.setTag("status_code", String(event.status_code))
				Sentry.captureException(event._originalError)
			})
		}
	}
}
