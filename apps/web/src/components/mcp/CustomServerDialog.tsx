import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type { McpServerConfig } from "shared"
import {
	useCreateCustomServer,
	useUpdateCustomServer,
} from "@/api/hooks/useMcp"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

import {
	type McpServerConfigFormValues,
	mcpServerConfigSchema,
} from "@/schemas/mcp"

type Props = {
	trigger: React.ReactNode
	serverId?: string
	initialData?: McpServerConfig
}

function toFormValues(config?: McpServerConfig): McpServerConfigFormValues {
	if (!config) return { type: "sse", url: "" }
	const raw = config as unknown as Record<string, unknown>
	const effectiveType: "sse" | "http" = config.type === "http" ? "http" : "sse"
	return { type: effectiveType, url: String(raw.url ?? "") }
}

function toMcpConfig(
	values: McpServerConfigFormValues,
	existing?: McpServerConfig,
): McpServerConfig {
	const headers =
		existing && "headers" in existing ? existing.headers : undefined
	return {
		type: values.type,
		url: values.url ?? "",
		...(headers !== undefined ? { headers } : {}),
	}
}

export function CustomServerDialog({ trigger, serverId, initialData }: Props) {
	const [open, setOpen] = useState(false)
	const createMutation = useCreateCustomServer()
	const updateMutation = useUpdateCustomServer()

	const form = useForm<McpServerConfigFormValues>({
		resolver: zodResolver(mcpServerConfigSchema),
		defaultValues: toFormValues(initialData),
	})

	useEffect(() => {
		if (open) {
			form.reset(toFormValues(initialData))
		}
	}, [open, initialData, form])

	const isPending = createMutation.isPending || updateMutation.isPending

	function onSubmit(values: McpServerConfigFormValues) {
		const mcpConfig = toMcpConfig(values, initialData)
		if (serverId) {
			updateMutation.mutate(
				{ serverId, mcpConfig },
				{ onSuccess: () => setOpen(false) },
			)
		} else {
			createMutation.mutate(
				{ mcpConfig },
				{
					onSuccess: () => {
						setOpen(false)
						form.reset(toFormValues(undefined))
					},
				},
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{serverId ? "Edit" : "Add"} Custom MCP Server
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Transport type</FormLabel>
									<Select
										onValueChange={(val) => {
											field.onChange(val)
										}}
										value={field.value}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="sse">SSE (URL)</SelectItem>
											<SelectItem value="http">HTTP (URL)</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Endpoint URL</FormLabel>
									<FormControl>
										<Input
											type="url"
											placeholder="https://your-mcp-server.example.com/mcp"
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter showCloseButton>
							<Button type="submit" disabled={isPending}>
								{isPending
									? "Saving..."
									: serverId
										? "Save changes"
										: "Add server"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
