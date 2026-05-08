export type WideEvent = {
	request_id: string
	timestamp: string
	method: string
	path: string
	service?: string
	version?: string
	deployment_id?: string
	region?: string
	status_code?: number
	outcome?: "success" | "error"
	duration_ms?: number
	error?: {
		type: string
		message: string
		code?: string
		retriable: boolean
	}
	/** Auth endpoints (register / login) */
	auth?: {
		outcome: "registered" | "logged_in" | "invalid_credentials"
	}
	/** Set by clientAuth middleware for /client/* and /widget/* routes */
	client?: {
		id: string
		status: "active" | "suspended"
		/** Present only on admin impersonation tokens */
		is_impersonated?: true
	}
	/** Set by adminAuth middleware for /admin/* routes */
	admin?: {
		id: string
		target_client_id?: string
		action?: "suspend" | "enable" | "impersonate"
	}
	/** Widget session / conversation context */
	widget?: {
		session_id?: string
		conversation_id?: string
		/** true = new session created, false = resumed */
		is_new_session?: boolean
	}
	/**
	 * AI context — provider/model known before streaming starts.
	 * Token counts are logged separately as `ai_usage` (correlated via request_id)
	 * because they only become available after the SSE stream finishes.
	 */
	ai?: {
		provider: string
		model: string
	}
	/** File operations (/client/me/files) */
	file?: {
		path?: string
		size_bytes?: number
		from_path?: string
		to_path?: string
	}
	// Not logged — carried so exporters can access the original exception for stack traces.
	_originalError?: unknown
}

export type EventExporter = {
	export(event: WideEvent): void
}
