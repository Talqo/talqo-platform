import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { adminMcpConfigBodySchema } from "shared"
import type { z } from "zod"
import type { paths } from "@/api/generated/openapi"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { type McpDialogFormValues, mcpDialogSchema } from "@/schemas/mcp"

type PreMadeServerResponse =
	paths["/admin/mcp/pre-made"]["get"]["responses"][200]["content"]["application/json"][number]

function toFormValues(
	initialValues: PreMadeServerResponse | undefined,
): McpDialogFormValues {
	if (!initialValues) {
		return { name: "", description: "", type: "http", url: "", headers: [] }
	}

	const config = initialValues.mcpConfig as Record<string, unknown>
	const type = config.type as "http" | "stdio"

	if (type === "stdio") {
		return {
			name: initialValues.name,
			description: initialValues.description ?? "",
			type: "stdio",
			command: String(config.command ?? ""),
			args: Array.isArray(config.args)
				? (config.args as string[]).map((v) => ({ value: v }))
				: [],
			env: recordToKvPairs(config.env as Record<string, string> | undefined),
		}
	}

	return {
		name: initialValues.name,
		description: initialValues.description ?? "",
		type: "http",
		url: String(config.url ?? ""),
		headers: recordToKvPairs(
			config.headers as Record<string, string> | undefined,
		),
	}
}

function toSubmitPayload(
	values: McpDialogFormValues,
): z.infer<typeof adminMcpConfigBodySchema> {
	const base = {
		name: values.name,
		description: values.description || undefined,
	}

	if (values.type === "stdio") {
		return {
			...base,
			mcpConfig: {
				type: "stdio",
				command: values.command,
				args:
					values.args && values.args.length > 0
						? values.args.map((a) => a.value).filter(Boolean)
						: undefined,
				env: kvPairsToRecord(values.env),
			},
		}
	}

	return {
		...base,
		mcpConfig: {
			type: "http",
			url: values.url,
			headers: kvPairsToRecord(values.headers),
		},
	}
}

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (payload: z.infer<typeof adminMcpConfigBodySchema>) => void
	initialValues?: PreMadeServerResponse
	isPending?: boolean
	error?: string | null
}

export function McpDialog({
	open,
	onOpenChange,
	onSubmit,
	initialValues,
	isPending = false,
	error = null,
}: Props) {
	const { t } = useTranslation()
	const isEdit = initialValues !== undefined

	const form = useForm<McpDialogFormValues>({
		resolver: zodResolver(mcpDialogSchema),
		defaultValues: toFormValues(initialValues),
	})

	const transportType = form.watch("type")

	const headerFields = useFieldArray({
		control: form.control,
		// biome-ignore lint/suspicious/noExplicitAny: discriminated union field arrays require any
		name: "headers" as any,
	})

	const envFields = useFieldArray({
		control: form.control,
		// biome-ignore lint/suspicious/noExplicitAny: discriminated union field arrays require any
		name: "env" as any,
	})

	const argFields = useFieldArray({
		control: form.control,
		// biome-ignore lint/suspicious/noExplicitAny: discriminated union field arrays require any
		name: "args" as any,
	})

	useEffect(() => {
		if (open) {
			form.reset(toFormValues(initialValues))
		}
	}, [open, initialValues, form])

	function handleSubmit(values: McpDialogFormValues) {
		onSubmit(toSubmitPayload(values))
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>
						{isEdit
							? t("backoffice.mcp.editServer")
							: t("backoffice.mcp.addServer")}
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						{/* Name */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("backoffice.mcp.name")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("backoffice.mcp.namePlaceholder")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Description */}
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("backoffice.mcp.description")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("backoffice.mcp.descriptionPlaceholder")}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Transport type */}
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("backoffice.mcp.transportType")}</FormLabel>
									<Select
										onValueChange={(val) => {
											if (val === "http") {
												form.reset({
													name: form.getValues("name"),
													description: form.getValues("description"),
													type: "http",
													url: "",
													headers: [],
												})
											} else {
												form.reset({
													name: form.getValues("name"),
													description: form.getValues("description"),
													type: "stdio",
													command: "",
													args: [],
													env: [],
												})
											}
											field.onChange(val)
										}}
										value={field.value}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue
													placeholder={t("backoffice.mcp.selectTransportType")}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="http">HTTP</SelectItem>
											<SelectItem value="stdio">stdio</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* HTTP fields */}
						{transportType === "http" && (
							<>
								<FormField
									control={form.control}
									name="url"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("backoffice.mcp.url")}</FormLabel>
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
									<div className="flex items-center justify-between">
										<FormLabel>{t("backoffice.mcp.headers")}</FormLabel>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												headerFields.append({
													key: "",
													value: "",
												})
											}
										>
											<PlusIcon className="size-4" />
											{t("backoffice.mcp.addHeader")}
										</Button>
									</div>
									{headerFields.fields.map((fieldItem, index) => (
										<div key={fieldItem.id} className="flex gap-2">
											<FormField
												control={form.control}
												// biome-ignore lint/suspicious/noExplicitAny: discriminated union field path
												name={`headers.${index}.key` as any}
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormControl>
															<Input
																placeholder={t("backoffice.mcp.headerKey")}
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												// biome-ignore lint/suspicious/noExplicitAny: discriminated union field path
												name={`headers.${index}.value` as any}
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormControl>
															<Input
																placeholder={t("backoffice.mcp.headerValue")}
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => headerFields.remove(index)}
												aria-label={t("backoffice.mcp.removeHeader")}
											>
												<Trash2Icon className="size-4" />
											</Button>
										</div>
									))}
								</div>
							</>
						)}

						{/* stdio fields */}
						{transportType === "stdio" && (
							<>
								<FormField
									control={form.control}
									name="command"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("backoffice.mcp.command")}</FormLabel>
											<FormControl>
												<Input
													placeholder={t("backoffice.mcp.commandPlaceholder")}
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Args */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<FormLabel>{t("backoffice.mcp.args")}</FormLabel>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => argFields.append({ value: "" })}
										>
											<PlusIcon className="size-4" />
											{t("backoffice.mcp.addArg")}
										</Button>
									</div>
									{argFields.fields.map((fieldItem, index) => (
										<div key={fieldItem.id} className="flex gap-2">
											<FormField
												control={form.control}
												// biome-ignore lint/suspicious/noExplicitAny: discriminated union field path
												name={`args.${index}.value` as any}
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormControl>
															<Input
																placeholder={t("backoffice.mcp.argValue")}
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => argFields.remove(index)}
												aria-label={t("backoffice.mcp.removeArg")}
											>
												<Trash2Icon className="size-4" />
											</Button>
										</div>
									))}
								</div>

								{/* Env */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<FormLabel>{t("backoffice.mcp.env")}</FormLabel>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												envFields.append({
													key: "",
													value: "",
												})
											}
										>
											<PlusIcon className="size-4" />
											{t("backoffice.mcp.addEnv")}
										</Button>
									</div>
									{envFields.fields.map((fieldItem, index) => (
										<div key={fieldItem.id} className="flex gap-2">
											<FormField
												control={form.control}
												// biome-ignore lint/suspicious/noExplicitAny: discriminated union field path
												name={`env.${index}.key` as any}
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormControl>
															<Input
																placeholder={t("backoffice.mcp.envKey")}
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												// biome-ignore lint/suspicious/noExplicitAny: discriminated union field path
												name={`env.${index}.value` as any}
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormControl>
															<Input
																placeholder={t("backoffice.mcp.envValue")}
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => envFields.remove(index)}
												aria-label={t("backoffice.mcp.removeEnv")}
											>
												<Trash2Icon className="size-4" />
											</Button>
										</div>
									))}
								</div>
							</>
						)}

						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<DialogFooter showCloseButton>
							<Button type="submit" disabled={isPending}>
								{isPending
									? t("backoffice.mcp.saving")
									: isEdit
										? t("backoffice.mcp.saveChanges")
										: t("backoffice.mcp.addServer")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
