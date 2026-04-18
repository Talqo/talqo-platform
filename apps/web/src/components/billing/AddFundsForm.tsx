import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useAddFunds } from "@/api/hooks"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function formatCardNumber(value: string) {
	return value
		.replace(/\D/g, "")
		.slice(0, 16)
		.replace(/(.{4})/g, "$1 ")
		.trim()
}

function formatExpiry(value: string) {
	const digits = value.replace(/\D/g, "").slice(0, 4)
	if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
	return digits
}

export function AddFundsForm() {
	const navigate = useNavigate()
	const addFunds = useAddFunds()

	const [amount, setAmount] = useState("")
	const [cardNumber, setCardNumber] = useState("")
	const [expiry, setExpiry] = useState("")
	const [cvv, setCvv] = useState("")
	const [nameOnCard, setNameOnCard] = useState("")
	const [success, setSuccess] = useState(false)

	const amountValue = Number.parseFloat(amount)
	const isAmountValid = !Number.isNaN(amountValue) && amountValue > 0
	const isCardValid =
		cardNumber.replace(/\s/g, "").length === 16 &&
		/^\d{2}\/\d{2}$/.test(expiry) &&
		/^\d{3}$/.test(cvv) &&
		nameOnCard.trim().length > 0
	const canSubmit = isAmountValid && isCardValid && !addFunds.isPending

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!canSubmit) return

		addFunds.mutate(
			{ amount: amountValue },
			{
				onSuccess: () => {
					setSuccess(true)
					setTimeout(() => navigate({ to: "/dashboard" }), 1500)
				},
			},
		)
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle>Add Funds</CardTitle>
				<CardDescription>
					Enter an amount and your card details to top up your balance.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="amount">Amount (USD)</Label>
						<div className="relative">
							<span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
								$
							</span>
							<Input
								id="amount"
								type="number"
								min="0.01"
								step="0.01"
								placeholder="0.00"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="pl-7"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="card-number">Card Number</Label>
						<Input
							id="card-number"
							inputMode="numeric"
							placeholder="1234 5678 9012 3456"
							value={cardNumber}
							onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
							autoComplete="cc-number"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="expiry">Expiry</Label>
							<Input
								id="expiry"
								inputMode="numeric"
								placeholder="MM/YY"
								value={expiry}
								onChange={(e) => setExpiry(formatExpiry(e.target.value))}
								autoComplete="cc-exp"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cvv">CVV</Label>
							<Input
								id="cvv"
								inputMode="numeric"
								placeholder="123"
								maxLength={3}
								value={cvv}
								onChange={(e) =>
									setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
								}
								autoComplete="cc-csc"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="name-on-card">Name on Card</Label>
						<Input
							id="name-on-card"
							placeholder="Jane Smith"
							value={nameOnCard}
							onChange={(e) => setNameOnCard(e.target.value)}
							autoComplete="cc-name"
						/>
					</div>

					{addFunds.isError && (
						<Alert variant="destructive">
							<AlertDescription>
								Failed to add funds. Please try again.
							</AlertDescription>
						</Alert>
					)}

					{success && (
						<Alert>
							<AlertDescription>
								Funds added successfully! Redirecting...
							</AlertDescription>
						</Alert>
					)}

					<Button type="submit" className="w-full" disabled={!canSubmit}>
						{addFunds.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : (
							`Pay $${isAmountValid ? amountValue.toFixed(2) : "0.00"}`
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
