import { X } from "lucide-react"
import { useState } from "react"
import {
	useAddBlacklistWord,
	useBlacklist,
	useRemoveBlacklistWord,
} from "@/api/hooks/useBlacklist"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export function BlacklistManager() {
	const { data: words, isLoading, isError } = useBlacklist()
	const addWord = useAddBlacklistWord()
	const removeWord = useRemoveBlacklistWord()
	const [newWord, setNewWord] = useState("")
	const [addError, setAddError] = useState<string | null>(null)

	const handleAdd = async () => {
		const trimmed = newWord.trim()
		if (!trimmed) return

		const isDuplicate = words?.some(
			(w) => w.word.toLowerCase() === trimmed.toLowerCase(),
		)
		if (isDuplicate) {
			setAddError(`"${trimmed}" is already in the blacklist.`)
			return
		}

		setAddError(null)
		try {
			await addWord.mutateAsync({ word: trimmed })
			setNewWord("")
		} catch {
			setAddError("Failed to add word. Please try again.")
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault()
			handleAdd()
		}
	}

	const handleRemove = async (wordId: string) => {
		try {
			await removeWord.mutateAsync(wordId)
		} catch {
			setAddError("Failed to remove word. Please try again.")
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Word Blacklist</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					The bot will not use or engage with blacklisted terms.
				</p>

				{addError && (
					<Alert variant="destructive">
						<AlertDescription>{addError}</AlertDescription>
					</Alert>
				)}

				<div className="flex gap-2">
					<Input
						value={newWord}
						onChange={(e) => {
							setNewWord(e.target.value)
							if (addError) setAddError(null)
						}}
						onKeyDown={handleKeyDown}
						placeholder="Type a word and press Enter or Add..."
						disabled={addWord.isPending}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={handleAdd}
						disabled={addWord.isPending || !newWord.trim()}
					>
						{addWord.isPending ? "Adding..." : "Add"}
					</Button>
				</div>

				{isLoading ? (
					<div className="flex flex-wrap gap-2">
						{Array.from({ length: 4 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
							<Skeleton key={i} className="h-6 w-20 rounded-full" />
						))}
					</div>
				) : isError ? (
					<Alert variant="destructive">
						<AlertDescription>
							Failed to load blacklist. Please refresh the page.
						</AlertDescription>
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
									aria-label={`Remove "${w.word}" from blacklist`}
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						No blacklisted words yet.
					</p>
				)}
			</CardContent>
		</Card>
	)
}
