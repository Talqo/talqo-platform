import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { AddWordInput } from "shared"
import { addWordBodySchema } from "shared"
import {
	useAddBlacklistWord,
	useBlacklist,
	useRemoveBlacklistWord,
} from "@/api/hooks/useBlacklist"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export function BlacklistManager() {
	const { t } = useTranslation()
	const { data: words, isLoading, isError } = useBlacklist()
	const addWord = useAddBlacklistWord()
	const removeWord = useRemoveBlacklistWord()
	const [listError, setListError] = useState<string | null>(null)

	const form = useForm<AddWordInput>({
		resolver: zodResolver(addWordBodySchema),
		defaultValues: { word: "" },
		mode: "onBlur",
	})

	const onSubmit = async (values: AddWordInput) => {
		if (!words) {
			form.setError("word", {
				message: t("blacklist.notLoaded"),
			})
			return
		}

		const trimmed = values.word.trim()
		if (trimmed.length === 0) {
			form.setError("word", {
				message: t("blacklist.emptyWord"),
			})
			return
		}

		const isDuplicate = words.some(
			(w) => w.word.toLowerCase() === trimmed.toLowerCase(),
		)
		if (isDuplicate) {
			form.setError("word", {
				message: t("blacklist.duplicateWord", { word: trimmed }),
			})
			return
		}

		try {
			await addWord.mutateAsync({ word: trimmed })
			form.reset()
			setListError(null)
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error("Failed to add word:", err)
			}
			form.setError("word", {
				message: t("blacklist.addFailed"),
			})
		}
	}

	const handleRemove = async (wordId: string) => {
		try {
			await removeWord.mutateAsync(wordId)
			setListError(null)
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error("Failed to remove word:", err)
			}
			setListError(t("blacklist.removeFailed"))
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("blacklist.title")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					{t("blacklist.description")}
				</p>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="word"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="sr-only">{t("common.word")}</FormLabel>
									<div className="flex gap-2">
										<FormControl>
											<Input
												placeholder={t("blacklist.wordPlaceholder")}
												disabled={addWord.isPending}
												{...field}
											/>
										</FormControl>
										<Button
											type="submit"
											variant="outline"
											disabled={addWord.isPending || isLoading || !words}
										>
											{addWord.isPending
												? t("blacklist.adding")
												: t("blacklist.add")}
										</Button>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>
				</Form>

				{isLoading ? (
					<div className="flex flex-wrap gap-2">
						{Array.from({ length: 4 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
							<Skeleton key={i} className="h-6 w-20 rounded-full" />
						))}
					</div>
				) : isError ? (
					<Alert variant="destructive">
						<AlertDescription>{t("blacklist.loadFailed")}</AlertDescription>
					</Alert>
				) : listError ? (
					<Alert variant="destructive">
						<AlertDescription>{listError}</AlertDescription>
					</Alert>
				) : words && words.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{words.map((w) => (
							<Badge key={w.id} variant="outline" className="gap-1 pr-1">
								{w.word}
								<button
									type="button"
									onClick={() => handleRemove(w.id)}
									disabled={removeWord.isPending}
									className="ml-0.5 rounded-full opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none"
									aria-label={t("blacklist.removeAriaLabel", {
										word: w.word,
									})}
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						{t("blacklist.noWords")}
					</p>
				)}
			</CardContent>
		</Card>
	)
}
