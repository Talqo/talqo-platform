const API_BASE_URL = (
	import.meta.env.VITE_API_URL ?? "http://localhost:3000/v1"
).replace(/\/?$/, "/");

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const url = new URL(path.replace(/^\//, ""), API_BASE_URL).toString();
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	if (!response.ok) {
		throw new ApiError(
			`API request failed: ${response.statusText}`,
			response.status,
		);
	}

	return response.json() as Promise<T>;
}

export const apiClient = {
	get: <T>(path: string) => request<T>(path, { method: "GET" }),
};
