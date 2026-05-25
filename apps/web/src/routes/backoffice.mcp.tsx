import { createFileRoute } from "@tanstack/react-router"
import { Loader2, PlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { adminMcpConfigBodySchema } from "shared"
import type { z } from "zod"
import type { paths } from "@/api/generated/openapi"
import {
	useAdminCreatePreMadeServer,
	useAdminDeletePreMadeServer,
	useAdminPreMadeServers,
	useAdminUpdatePreMadeServer,
} from "@/api/hooks/useAdmin"
import { McpDialog } from "@/components/backoffice/McpDialog"
import { McpTable } from "@/components/backoffice/McpTable"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PreMadeServerResponse =
	paths["/admin/mcp/pre-made"]["get"]["responses"][200]["content"]["application/json"][number]

export const Route = createFileRoute("/backoffice/mcp")({
	component: BackofficeMcpPage,
})

function BackofficeMcpPage() {
	const { t } = useTranslation()
	const {
		data: servers,
		isLoading,
		error: fetchError,
	} = useAdminPreMadeServers()
	const createPreMadeServer = useAdminCreatePreMadeServer()
	const updatePreMadeServer = useAdminUpdatePreMadeServer()
	const deletePreMadeServer = useAdminDeletePreMadeServer()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingServer, setEditingServer] = useState<
		PreMadeServerResponse | undefined
	>()
	const [serverToDelete, setServerToDelete] = useState<
		PreMadeServerResponse | undefined
	>()
	const [pendingId, setPendingId] = useState<string | undefined>()
	const [mutationError, setMutationError] = useState<string | null>(null)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	function handleAddServer() {
		setEditingServer(undefined)
		setMutationError(null)
		setDialogOpen(true)
	}

	function handleEdit(server: PreMadeServerResponse) {
		setEditingServer(server)
		setMutationError(null)
		setDialogOpen(true)
	}

	function handleDelete(server: PreMadeServerResponse) {
		setDeleteError(null)
		setServerToDelete(server)
	}

	function handleDialogSubmit(
		payload: z.infer<typeof adminMcpConfigBodySchema>,
	) {
		if (editingServer) {
			setPendingId(editingServer.id)
			updatePreMadeServer.mutate(
				{ serverId: editingServer.id, ...payload },
				{
					onSettled: () => setPendingId(undefined),
					onSuccess: () => {
						setDialogOpen(false)
						setEditingServer(undefined)
					},
					onError: (err) => {
						const apiErr = err as { error?: { message?: string } }
						setMutationError(
							apiErr.error?.message ?? t("backoffice.mcp.updateFailed"),
						)
					},
				},
			)
		} else {
			createPreMadeServer.mutate(payload, {
				onSuccess: () => {
					setDialogOpen(false)
				},
				onError: (err) => {
					const apiErr = err as { error?: { message?: string } }
					setMutationError(
						apiErr.error?.message ?? t("backoffice.mcp.createFailed"),
					)
				},
			})
		}
	}

	function handleConfirmDelete() {
		if (!serverToDelete) return
		setPendingId(serverToDelete.id)
		setDeleteError(null)
		deletePreMadeServer.mutate(serverToDelete.id, {
			onSettled: () => {
				setPendingId(undefined)
			},
			onSuccess: () => {
				setServerToDelete(undefined)
			},
			onError: (err) => {
				const apiErr = err as { error?: { message?: string } }
				setDeleteError(
					apiErr.error?.message ?? t("backoffice.mcp.deleteFailed"),
				)
			},
		})
	}

	const isDialogPending =
		createPreMadeServer.isPending || updatePreMadeServer.isPending

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">
					{t("backoffice.mcp.pageTitle")}
				</h1>
				<p className="text-muted-foreground">
					{t("backoffice.mcp.pageDescription")}
				</p>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{t("backoffice.mcp.configuredServers")}</CardTitle>
					<Button onClick={handleAddServer}>
						<PlusIcon className="mr-2 h-4 w-4" />
						{t("backoffice.mcp.addServer")}
					</Button>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex h-40 items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : fetchError ? (
						<p className="py-8 text-center text-destructive text-sm">
							{t("backoffice.mcp.fetchFailed")}
						</p>
					) : (
						<McpTable
							servers={servers}
							onEdit={handleEdit}
							onDelete={handleDelete}
							pendingId={pendingId}
						/>
					)}
				</CardContent>
			</Card>

			<McpDialog
				open={dialogOpen}
				onOpenChange={(open) => {
					setDialogOpen(open)
					if (!open) {
						setEditingServer(undefined)
						setMutationError(null)
					}
				}}
				onSubmit={handleDialogSubmit}
				initialValues={editingServer}
				isPending={isDialogPending}
				error={mutationError}
			/>

			<ConfirmDialog
				open={serverToDelete !== undefined}
				onOpenChange={(open) => {
					if (!open) {
						setServerToDelete(undefined)
						setDeleteError(null)
					}
				}}
				title={t("backoffice.mcp.deleteConfirmTitle")}
				description={t("backoffice.mcp.deleteConfirmDescription")}
				confirmLabel={t("backoffice.mcpServersTable.delete")}
				cancelLabel={t("common.cancel")}
				variant="destructive"
				onConfirm={handleConfirmDelete}
				confirmLoading={deletePreMadeServer.isPending}
				error={deleteError}
			/>
		</div>
	)
}
