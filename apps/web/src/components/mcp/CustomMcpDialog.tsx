import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import type { McpRemoteServerConfig } from "shared"
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
import { kvPairsToRecord, recordToKvPairs } from "@/lib/mcp-utils"
import { type McpConfigFormValues, mcpConfigFormSchema } from "@/schemas/mcp"

type Props = {
	trigger: React.ReactNode
	serverId?: string
	initialData?: McpRemoteServerConfig
}

function toFormValues(config?: McpRemoteServerConfig): McpConfigFormValues {
	if (!config) return { type: "http", url: "", headers: [] }
	return {
		type: "http",
		url: config.url,
		headers: recordToKvPairs(config.headers),
	}
}

function toMcpConfig(values: McpConfigFormValues): McpRemoteServerConfig {
	return {
		type: "http",
		url: values.url,
		headers: kvPairsToRecord(values.headers),
	}
}

export function CustomMcpDialog({ trigger, serverId, initialData }: Props) {
	const [open, setOpen] = useState(false)
	const createMutation = useCreateCustomServer()
	const updateMutation = useUpdateCustomServer()

	const form = useForm<McpConfigFormValues>({
		resolver: zodResolver(mcpConfigFormSchema),
		defaultValues: toFormValues(initialData),
	})

	const headerFields = useFieldArray({
		control: form.control,
		name: "headers",
	})

	useEffect(() => {
		if (open) {
			form.reset(toFormValues(initialData))
		}
	}, [open, initialData, form])

	const isPending = createMutation.isPending || updateMutation.isPending

	function onSubmit(values: McpConfigFormValues) {
		const mcpConfig = toMcpConfig(values)
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
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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

						{/* Headers */}
						<div className="space-y-2">
							<FormLabel>Headers</FormLabel>
							{headerFields.fields.map((fieldItem, index) => (
								<div key={fieldItem.id} className="flex gap-2">
									<FormField
										control={form.control}
										name={`headers.${index}.key`}
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormControl>
													<Input placeholder="Key" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name={`headers.${index}.value`}
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormControl>
													<Input placeholder="Value" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Remove header"
										onClick={() => headerFields.remove(index)}
									>
										<Trash2Icon className="size-4" />
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => headerFields.append({ key: "", value: "" })}
							>
								<PlusIcon className="mr-1 size-4" />
								Add header
							</Button>
						</div>

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
