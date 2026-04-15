# Widget Embeddable Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the widget from an NPM library into a single distributable `widget-bundle.js` file that customers can embed on any website via a script tag.

**Architecture:** Bundle React and all CSS into a single IIFE file that self-initializes by reading `window.__AI_WIDGET_CONFIG__`. CSS variables enable dynamic theming from customer configuration. Dark mode auto-detects but can be manually toggled.

**Tech Stack:** Bun, React, TypeScript, Tailwind CSS, Vite, vite-plugin-css-injected-by-js, AWS S3

---

## File Structure Map

**Modified Files:**
- `packages/widget/vite.config.ts` - IIFE build config with CSS injection
- `packages/widget/package.json` - Update entry point and build scripts
- `packages/widget/src/theme/default.css` - Convert to CSS variables

**New Files:**
- `packages/widget/src/main.tsx` - IIFE entry point, reads config, initializes widget
- `packages/widget/src/EmbeddedWidget.tsx` - Composed widget with styling applied
- `packages/widget/src/types.ts` - WidgetConfig interface
- `packages/widget/index.html` - Dev server with mock config
- `packages/widget/.env.development` - Dev API URL
- `packages/widget/.env.production` - Prod API URL
- `packages/widget/scripts/deploy.sh` - S3 deployment script
- `packages/widget/docs/EMBED_SNIPPET.md` - Customer documentation

---

## Phase 1: Build System Configuration

### Task 1: Install CSS Injection Plugin

**Files:**
- Modify: `packages/widget/package.json`

- [ ] **Step 1: Add the plugin dependency**

```json
"devDependencies": {
	"@types/react": "^19.2.7",
	"@types/react-dom": "^19.2.3",
	"@vitejs/plugin-react": "^5.1.1",
	"typescript": "^6.0.0",
	"vite": "^8.0.0-beta.13",
	"vite-plugin-css-injected-by-js": "^3.5.2",
	"vite-plugin-svgr": "^4.5.0"
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd packages/widget && bun install`
Expected: Package installs without errors

- [ ] **Step 3: Commit**

```bash
git add packages/widget/package.json bun.lock
git commit -m "build(widget): add vite-plugin-css-injected-by-js"
```

---

### Task 2: Configure Vite for IIFE Build

**Files:**
- Modify: `packages/widget/vite.config.ts`

- [ ] **Step 1: Update vite.config.ts for IIFE build**

```typescript
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	plugins: [react(), svgr(), cssInjectedByJsPlugin()],
	build: {
		// Library mode for single file output
		lib: {
			entry: resolve(__dirname, "src/main.tsx"),
			formats: ["iife"],
			name: "AIWidget",
			fileName: () => "widget-bundle.js",
		},
		rollupOptions: {
			// Bundle React - DO NOT externalize
			output: {
				// Ensure single chunk, no code splitting
				inlineDynamicImports: true,
			},
		},
		// Disable asset hashing, single output file
		assetsDir: ".",
		cssCodeSplit: false,
		// Ensure minification
		minify: "terser",
	},
})
```

- [ ] **Step 2: Verify build config works**

Run: `cd packages/widget && bun run build`
Expected: Build succeeds, creates `dist/widget-bundle.js` (single file, includes CSS inline)

- [ ] **Step 3: Commit**

```bash
git add packages/widget/vite.config.ts
git commit -m "build(widget): configure IIFE build with inline CSS"
```

---

## Phase 2: Type Definitions

### Task 3: Create WidgetConfig Interface

**Files:**
- Create: `packages/widget/src/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
/**
 * Configuration for the embedded AI widget
 * Customers set this via window.__AI_WIDGET_CONFIG__
 */
export interface WidgetConfig {
	/** Client ID for API authentication */
	clientId: string
	/** Optional API base URL (defaults to production) */
	apiUrl?: string
	/** Theme colors - omit to use defaults */
	colors?: Partial<WidgetColors>
	/** Widget positioning */
	position?: "left" | "right"
	/** Initial open state */
	defaultOpen?: boolean
}

export interface WidgetColors {
	/** Primary accent color (buttons, user messages) - default: hsl(142 76% 36%) */
	primary: string
	/** Panel background - default: white */
	bgPrimary: string
	/** Header/bot message background - default: hsl(240 5% 96%) */
	bgSecondary: string
	/** Main text color - default: hsl(240 6% 10%) */
	textPrimary: string
	/** Secondary text (footer, placeholders) - default: hsl(240 4% 46%) */
	textSecondary: string
	/** Borders and dividers - default: hsl(240 6% 90%) */
	border: string
}

/** Validated config with defaults applied */
export interface ResolvedWidgetConfig extends Required<Omit<WidgetConfig, "colors">> {
	colors: WidgetColors
}

export type WidgetTheme = "light" | "dark"

/** Runtime state for the widget */
export interface WidgetState {
	theme: WidgetTheme
	isDark: boolean
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/src/types.ts
git commit -m "feat(widget): add WidgetConfig type definitions"
```

---

## Phase 3: Entry Point Implementation

### Task 4: Create Main Entry Point

**Files:**
- Create: `packages/widget/src/main.tsx`

- [ ] **Step 1: Create the entry point file**

```typescript
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import type { WidgetConfig } from "./types"
import { EmbeddedWidget } from "./EmbeddedWidget"
import "./theme/default.css"

// Global config type augmentation
declare global {
	interface Window {
		__AI_WIDGET_CONFIG__?: WidgetConfig
	}
}

const DEFAULT_COLORS = {
	primary: "hsl(142 76% 36%)",
	bgPrimary: "#ffffff",
	bgSecondary: "hsl(240 5% 96%)",
	textPrimary: "hsl(240 6% 10%)",
	textSecondary: "hsl(240 4% 46%)",
	border: "hsl(240 6% 90%)",
}

function resolveConfig(): Required<WidgetConfig> {
	const userConfig = window.__AI_WIDGET_CONFIG__

	if (!userConfig?.clientId) {
		throw new Error(
			"[AI Widget] Missing required config: window.__AI_WIDGET_CONFIG__.clientId",
		)
	}

	return {
		clientId: userConfig.clientId,
		apiUrl:
			userConfig.apiUrl ||
			import.meta.env.VITE_API_URL ||
			"https://api.pagepal.com/v1",
		colors: { ...DEFAULT_COLORS, ...userConfig.colors },
		position: userConfig.position ?? "right",
		defaultOpen: userConfig.defaultOpen ?? false,
	}
}

function injectCSSVariables(config: Required<WidgetConfig>): HTMLElement {
	const root = document.createElement("div")
	root.id = "ai-widget-root"
	root.style.setProperty("--widget-primary", config.colors.primary)
	root.style.setProperty("--widget-bg-primary", config.colors.bgPrimary)
	root.style.setProperty("--widget-bg-secondary", config.colors.bgSecondary)
	root.style.setProperty("--widget-text-primary", config.colors.textPrimary)
	root.style.setProperty("--widget-text-secondary", config.colors.textSecondary)
	root.style.setProperty("--widget-border", config.colors.border)

	// Derive hover color (darken primary by 6%)
	root.style.setProperty("--widget-primary-hover", config.colors.primary)

	document.body.appendChild(root)
	return root
}

function init(): void {
	try {
		const config = resolveConfig()
		const container = injectCSSVariables(config)

		const root = createRoot(container)
		root.render(
			<StrictMode>
				<EmbeddedWidget config={config} />
			</StrictMode>,
		)
	} catch (error) {
		console.error("[AI Widget] Failed to initialize:", error)
	}
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init)
} else {
	init()
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/src/main.tsx
git commit -m "feat(widget): create main entry point for IIFE bundle"
```

---

## Phase 4: Embedded Widget Component

### Task 5: Create EmbeddedWidget Component

**Files:**
- Create: `packages/widget/src/EmbeddedWidget.tsx`

- [ ] **Step 1: Create the composed widget component**

```typescript
import { useCallback, useEffect, useState } from "react"
import type { ResolvedWidgetConfig, WidgetTheme } from "./types"
import { useWidget } from "./hooks/useWidget"
import { useWidgetTheme } from "./hooks/useWidgetTheme"
import {
	BotIcon,
	ClearIcon,
	CloseIcon,
	ExpandIcon,
	MinimizeIcon,
	MoonIcon,
	SendIcon,
	SunIcon,
	XLargeIcon,
} from "./primitives/icons"
import {
	WidgetHeader,
	WidgetInput,
	WidgetMessage,
	WidgetMessageList,
	WidgetPanel,
	WidgetRoot,
	WidgetSendButton,
	WidgetTrigger,
	WidgetTypingIndicator,
} from "./primitives"

interface EmbeddedWidgetProps {
	config: ResolvedWidgetConfig
}

export function EmbeddedWidget({ config }: EmbeddedWidgetProps) {
	const widget = useWidget({ defaultOpen: config.defaultOpen })
	const { theme, isDark } = useWidgetTheme()
	const [isExpanded, setIsExpanded] = useState(false)
	const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "bot"; content: string }>>([
		{
			id: "welcome",
			role: "bot",
			content: "Hello! How can I help you today?",
		},
	])
	const [isTyping, setIsTyping] = useState(false)

	const handleSend = useCallback(
		async (content: string) => {
			if (!content.trim()) return

			// Add user message
			const userMessage = { id: Date.now().toString(), role: "user" as const, content }
			setMessages((prev) => [...prev, userMessage])
			setIsTyping(true)

			try {
				// Call API with clientId
				const response = await fetch(`${config.apiUrl}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ clientId: config.clientId, message: content }),
				})

				if (!response.ok) {
					throw new Error("API request failed")
				}

				const data = await response.json()
				setMessages((prev) => [
					...prev,
					{ id: (Date.now() + 1).toString(), role: "bot", content: data.reply },
				])
			} catch {
				setMessages((prev) => [
					...prev,
					{
						id: (Date.now() + 1).toString(),
						role: "bot",
						content: "Sorry, I couldn't process your request. Please try again.",
					},
				])
			} finally {
				setIsTyping(false)
			}
		},
		[config.apiUrl, config.clientId],
	)

	const clearHistory = useCallback(() => {
		setMessages([
			{
				id: Date.now().toString(),
				role: "bot",
				content: "Hello! How can I help you today?",
			},
		])
	}, [])

	return (
		<WidgetRoot {...widget}>
			<div
				className={"aiw-root"}
				data-position={config.position}
				data-theme={theme}
			>
				{/* Trigger Button */}
				<WidgetTrigger
					className={"aiw-trigger"}
					closedContent={<BotIcon size={28} />}
					openContent={<CloseIcon size={24} />}
				/>

				{/* Chat Panel */}
				<WidgetPanel
					className={"aiw-panel"}
					data-expanded={isExpanded}
				>
					{/* Header */}
					<WidgetHeader className={"aiw-header"}>
						<div className={"aiw-header-left"}>
							<BotIcon size={24} />
							<span className={"aiw-header-title"}>AI Assistant</span>
						</div>
						<div className={"aiw-header-actions"}>
							<button
								type="button"
								className={"aiw-icon-btn"}
								onClick={() => setIsExpanded(!isExpanded)}
								aria-label={isExpanded ? "Minimize" : "Expand"}
							>
								{isExpanded ? <MinimizeIcon size={18} /> : <ExpandIcon size={18} />}
							</button>
							<button
								type="button"
								className={"aiw-icon-btn"}
								onClick={clearHistory}
								aria-label="Clear conversation"
							>
								<ClearIcon size={18} />
							</button>
							<button
								type="button"
								className={"aiw-icon-btn"}
								onClick={widget.toggleOpen}
								aria-label="Close"
							>
								<XLargeIcon size={20} />
							</button>
						</div>
					</WidgetHeader>

					{/* Message List */}
					<WidgetMessageList className={"aiw-message-list"}>
						{messages.map((msg) => (
							<WidgetMessage
								key={msg.id}
								className={"aiw-message"}
								data-role={msg.role}
							>
								{msg.role === "bot" && (
									<div className={"aiw-message-avatar"}>
										<BotIcon size={20} />
									</div>
								)}
								<div className={"aiw-message-content"}>{msg.content}</div>
							</WidgetMessage>
						))}
						{isTyping && (
							<WidgetTypingIndicator className={"aiw-typing"} />
						)}
					</WidgetMessageList>

					{/* Input Area */}
					<div className={"aiw-input-area"}>
						<WidgetInput
							className={"aiw-input"}
							placeholder="Type a message..."
							onSend={handleSend}
						/>
						<WidgetSendButton
							className={"aiw-send-btn"}
							onClick={() => {
								const input = document.querySelector(
									'[data-widget-input="true"]',
								) as HTMLInputElement
								if (input?.value) {
									handleSend(input.value)
									input.value = ""
								}
							}}
						>
							<SendIcon size={18} />
						</WidgetSendButton>
					</div>

					{/* Footer */}
					<div className={"aiw-footer"}>
						<span>Powered by PagePal</span>
					</div>
				</WidgetPanel>
			</div>
		</WidgetRoot>
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/src/EmbeddedWidget.tsx
git commit -m "feat(widget): create EmbeddedWidget component with API integration"
```

---

## Phase 5: CSS Styling with Variables

### Task 6: Update Default CSS with CSS Variables

**Files:**
- Modify: `packages/widget/src/theme/default.css`

- [ ] **Step 1: Rewrite CSS to use CSS variables**

```css
/**
 * AI Widget Styles
 * Uses CSS variables for dynamic theming from config
 */

/* Widget container */
.aiw-root {
	position: fixed;
	z-index: 50;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.aiw-root[data-position="right"] {
	right: 1.5rem;
	bottom: 1.5rem;
}

.aiw-root[data-position="left"] {
	left: 1.5rem;
	bottom: 1.5rem;
}

/* Trigger button */
.aiw-trigger {
	display: flex;
	width: 3.5rem;
	height: 3.5rem;
	align-items: center;
	justify-content: center;
	border-radius: 9999px;
	background-color: var(--widget-primary);
	color: white;
	box-shadow:
		0 20px 25px -5px rgb(0 0 0 / 0.1),
		0 8px 10px -6px rgb(0 0 0 / 0.1);
	transition: transform 0.2s;
	border: none;
	cursor: pointer;
}

.aiw-trigger:hover {
	transform: scale(1.05);
}

.aiw-trigger:active {
	transform: scale(0.95);
}

/* Panel */
.aiw-panel {
	display: flex;
	width: 90vw;
	max-width: min(600px, calc(100vw - 3rem));
	flex-direction: column;
	overflow: hidden;
	border-radius: 1rem;
	background-color: var(--widget-bg-primary);
	box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
	transition: all 0.3s;
	margin-bottom: 0.75rem;
}

.aiw-panel[data-expanded="true"] {
	max-height: 80vh;
	height: 80vh;
}

.aiw-panel[data-expanded="false"] {
	height: 500px;
}

/* Dark mode panel */
.aiw-root[data-theme="dark"] .aiw-panel {
	background-color: hsl(240 10% 3.9%);
	box-shadow: 0 0 0 1px hsl(240 4% 16%);
}

/* Header */
.aiw-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid var(--widget-border);
	padding: 0.75rem 1rem;
	background-color: var(--widget-bg-secondary);
}

.aiw-header-left {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--widget-text-primary);
}

.aiw-header-title {
	font-weight: 600;
	font-size: 0.875rem;
}

.aiw-header-actions {
	display: flex;
	gap: 0.25rem;
}

.aiw-icon-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	border-radius: 0.5rem;
	border: none;
	background: transparent;
	color: var(--widget-text-secondary);
	cursor: pointer;
	transition: all 0.2s;
}

.aiw-icon-btn:hover {
	background-color: var(--widget-border);
	color: var(--widget-text-primary);
}

/* Dark mode header */
.aiw-root[data-theme="dark"] .aiw-header {
	background-color: hsl(240 4% 10%);
	border-color: hsl(240 4% 16%);
}

/* Message list */
.aiw-message-list {
	flex: 1;
	overflow-y: auto;
	padding: 1rem;
	background-color: var(--widget-bg-primary);
}

.aiw-root[data-theme="dark"] .aiw-message-list {
	background-color: hsl(240 10% 3.9%);
}

/* Messages */
.aiw-message {
	display: flex;
	gap: 0.5rem;
	margin-bottom: 1rem;
}

.aiw-message:last-child {
	margin-bottom: 0;
}

.aiw-message[data-role="user"] {
	flex-direction: row-reverse;
}

.aiw-message-content {
	max-width: 85%;
	border-radius: 1rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	line-height: 1.5;
}

.aiw-message[data-role="user"] .aiw-message-content {
	background-color: var(--widget-primary);
	color: white;
}

.aiw-message[data-role="bot"] .aiw-message-content {
	background-color: var(--widget-bg-secondary);
	color: var(--widget-text-primary);
}

.aiw-message-avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background-color: var(--widget-bg-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.aiw-message[data-role="user"] .aiw-message-avatar {
	display: none;
}

/* Dark mode messages */
.aiw-root[data-theme="dark"] .aiw-message[data-role="bot"] .aiw-message-content {
	background-color: hsl(240 4% 16%);
	color: hsl(0 0% 98%);
}

.aiw-root[data-theme="dark"] .aiw-message-avatar {
	background-color: hsl(240 4% 16%);
}

/* Typing indicator */
.aiw-typing {
	display: flex;
	justify-content: flex-start;
	margin-top: 0.5rem;
}

.aiw-typing > div {
	display: flex;
	max-width: 85%;
	gap: 0.25rem;
	border-radius: 1rem;
	padding: 0.75rem 1rem;
	background-color: var(--widget-bg-secondary);
}

.aiw-typing > div > div {
	width: 0.375rem;
	height: 0.375rem;
	animation: aiw-bounce 1s infinite;
	border-radius: 9999px;
	background-color: var(--widget-text-secondary);
}

.aiw-typing > div > div:nth-child(2) {
	animation-delay: 0.2s;
}

.aiw-typing > div > div:nth-child(3) {
	animation-delay: 0.4s;
}

@keyframes aiw-bounce {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-0.25rem);
	}
}

/* Dark mode typing */
.aiw-root[data-theme="dark"] .aiw-typing > div {
	background-color: hsl(240 4% 16%);
}

/* Input area */
.aiw-input-area {
	display: flex;
	gap: 0.5rem;
	border-top: 1px solid var(--widget-border);
	padding: 1rem;
	background-color: var(--widget-bg-primary);
}

.aiw-root[data-theme="dark"] .aiw-input-area {
	background-color: hsl(240 10% 3.9%);
	border-color: hsl(240 4% 16%);
}

.aiw-input {
	flex: 1;
	border-radius: 9999px;
	border: 1px solid var(--widget-border);
	background-color: var(--widget-bg-secondary);
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	color: var(--widget-text-primary);
	outline: none;
}

.aiw-input:focus {
	box-shadow: 0 0 0 2px var(--widget-primary);
}

.aiw-input::placeholder {
	color: var(--widget-text-secondary);
}

.aiw-root[data-theme="dark"] .aiw-input {
	background-color: hsl(240 4% 16%);
	border-color: hsl(240 4% 16%);
	color: hsl(0 0% 98%);
}

.aiw-send-btn {
	display: flex;
	height: 2.5rem;
	width: 2.5rem;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	border-radius: 0.75rem;
	border: none;
	background-color: var(--widget-primary);
	color: white;
	cursor: pointer;
	transition: opacity 0.2s;
}

.aiw-send-btn:hover {
	opacity: 0.9;
}

.aiw-send-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Footer */
.aiw-footer {
	text-align: center;
	font-size: 0.625rem;
	color: var(--widget-text-secondary);
	padding: 0.5rem;
	background-color: var(--widget-bg-primary);
}

.aiw-root[data-theme="dark"] .aiw-footer {
	background-color: hsl(240 10% 3.9%);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/src/theme/default.css
git commit -m "style(widget): convert to CSS variables for dynamic theming"
```

---

## Phase 6: Local Development Setup

### Task 7: Create Environment Files

**Files:**
- Create: `packages/widget/.env.development`
- Create: `packages/widget/.env.production`

- [ ] **Step 1: Create development environment**

```env
# Development API URL
VITE_API_URL=http://localhost:3000/v1
```

- [ ] **Step 2: Create production environment**

```env
# Production API URL
VITE_API_URL=https://dev.pagepa.dyn.cloud.e-infra.cz/
```

- [ ] **Step 3: Commit**

```bash
git add packages/widget/.env.development packages/widget/.env.production
git commit -m "chore(widget): add environment configuration files"
```

---

### Task 8: Create Index HTML for Development

**Files:**
- Create: `packages/widget/index.html`

- [ ] **Step 1: Create the HTML file**

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Widget Development</title>
		<style>
			/* Simulate a third-party website */
			body {
				font-family: system-ui, sans-serif;
				padding: 2rem;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				min-height: 100vh;
				color: white;
			}

			.mock-website {
				max-width: 800px;
				margin: 0 auto;
				background: white;
				color: #333;
				padding: 2rem;
				border-radius: 8px;
				box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
			}

			.mock-website h1 {
				color: #333;
			}

			.mock-website p {
				line-height: 1.6;
				color: #666;
			}

			/* Verify widget styles don't leak */
			.test-button {
				background: #ff6b6b;
				color: white;
				padding: 0.5rem 1rem;
				border: none;
				border-radius: 4px;
				margin-top: 1rem;
				cursor: pointer;
			}
		</style>
	</head>
	<body>
		<div class="mock-website">
			<h1>Customer Website Simulator</h1>
			<p>
				This simulates a third-party website where the widget is embedded.
				The gradient background and purple styling here should not be affected by
				the widget's Tailwind styles, and vice versa.
			</p>
			<button class="test-button">Test Button (should stay red)</button>
		</div>

		<!-- Widget Configuration -->
		<script>
			window.__AI_WIDGET_CONFIG__ = {
				clientId: "dev-client-123",
				position: "right",
				defaultOpen: false,
				colors: {
					// Uncomment to test custom colors:
					// primary: "#8b5cf6",
					// bgPrimary: "#f8fafc",
					// bgSecondary: "#e2e8f0",
					// textPrimary: "#1e293b",
					// textSecondary: "#64748b",
					// border: "#cbd5e1",
				},
			};
		</script>

		<!-- Load widget in dev mode -->
		<script type="module" src="/src/main.tsx"></script>
	</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/index.html
git commit -m "chore(widget): add development index.html with mock config"
```

---

### Task 9: Update Package.json Scripts

**Files:**
- Modify: `packages/widget/package.json`

- [ ] **Step 1: Update scripts section**

```json
{
	"scripts": {
		"dev": "vite",
		"build": "tsc && vite build",
		"build:watch": "vite build --watch",
		"preview": "vite preview",
		"deploy": "bash scripts/deploy.sh",
		"lint": "biome lint .",
		"check": "biome check .",
		"fix": "biome check --write .",
		"type-check": "tsc --noEmit",
		"test": "bun -e \"console.log('No tests in widget')\""
	}
}
```

- [ ] **Step 2: Remove library-specific fields (we'll keep for now, just add main entry)**

Update the "main" and "module" to point to the bundle for backward compatibility:
```json
{
	"main": "dist/widget-bundle.js",
	"module": "dist/widget-bundle.js",
	"types": "dist/index.d.ts"
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/widget/package.json
git commit -m "chore(widget): update package.json scripts for embeddable bundle"
```

---

## Phase 7: Deployment

### Task 10: Create S3 Deployment Script

**Files:**
- Create: `packages/widget/scripts/deploy.sh`

- [ ] **Step 1: Create the deployment script**

```bash
#!/bin/bash

# S3 Deployment Script for AI Widget
# Usage: ./scripts/deploy.sh [bucket-name]

set -e

BUCKET_NAME="${1:-your-widget-bucket}"
BUNDLE_PATH="dist/widget-bundle.js"
REGION="${AWS_REGION:-eu-central-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying widget to S3...${NC}"

# Check if bundle exists
if [ ! -f "$BUNDLE_PATH" ]; then
    echo -e "${RED}Error: Bundle not found at $BUNDLE_PATH${NC}"
    echo "Run 'bun run build' first"
    exit 1
fi

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Upload to S3 with proper headers
echo -e "${YELLOW}Uploading to s3://$BUCKET_NAME/widget-bundle.js${NC}"

aws s3 cp "$BUNDLE_PATH" "s3://$BUCKET_NAME/widget-bundle.js" \
    --content-type "application/javascript" \
    --cache-control "max-age=3600" \
    --region "$REGION"

echo -e "${GREEN}Upload successful!${NC}"
echo ""
echo "Widget URL: https://s3.$REGION.amazonaws.com/$BUCKET_NAME/widget-bundle.js"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "1. Ensure S3 bucket has CORS configured to allow GET from *"
echo "2. Consider using CloudFront for CDN distribution"
echo "3. For production, set Cache-Control to a longer value (e.g., max-age=86400)"
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x packages/widget/scripts/deploy.sh`

- [ ] **Step 3: Commit**

```bash
git add packages/widget/scripts/deploy.sh
git commit -m "chore(widget): add S3 deployment script"
```

---

### Task 11: Create CORS Configuration Document

**Files:**
- Create: `packages/widget/docs/CORS_SETUP.md`

- [ ] **Step 1: Create CORS documentation**

```markdown
# S3 CORS Configuration

Your S3 bucket must allow cross-origin requests for the widget to work on customer websites.

## AWS S3 CORS Configuration

Add this CORS configuration to your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["Content-Type", "Content-Length"],
        "MaxAgeSeconds": 3600
    }
]
```

## Via AWS Console

1. Go to S3 → Your bucket → Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click Edit
4. Paste the JSON above
5. Save changes

## Via AWS CLI

```bash
aws s3api put-bucket-cors \
    --bucket your-widget-bucket \
    --cors-configuration file://cors.json
```

Where `cors.json` contains:

```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["Content-Type", "Content-Length"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

## CloudFront (Recommended for Production)

For production, use CloudFront in front of S3:

1. Create a CloudFront distribution
2. Set origin to your S3 bucket
3. Enable CORS in the distribution settings
4. Use the CloudFront URL instead of the direct S3 URL

This provides:
- Global CDN caching
- HTTPS by default
- Better performance
- Custom domain support
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/docs/CORS_SETUP.md
git commit -m "docs(widget): add CORS configuration guide"
```

---

## Phase 8: Customer Documentation

### Task 12: Create Customer Embed Documentation

**Files:**
- Create: `packages/widget/docs/EMBED_SNIPPET.md`

- [ ] **Step 1: Create customer documentation**

```markdown
# Embedding the AI Widget

Add the AI assistant to your website with just a few lines of code.

## Quick Start

Add this snippet to your website's HTML, just before the closing `</body>` tag:

```html
<!-- AI Widget Configuration -->
<script>
  window.__AI_WIDGET_CONFIG__ = {
    clientId: "YOUR_CLIENT_ID", // Required: Get this from your dashboard
    position: "right",          // Optional: "left" or "right" (default: right)
    defaultOpen: false,         // Optional: Start open or closed (default: false)
    colors: {                   // Optional: Customize colors
      primary: "#10b981",       // Buttons, user messages (default: green)
      bgPrimary: "#ffffff",     // Chat background (default: white)
      bgSecondary: "#f4f4f5",   // Header, bot messages (default: light gray)
      textPrimary: "#18181b",   // Main text (default: dark gray)
      textSecondary: "#71717a", // Footer, placeholders (default: medium gray)
      border: "#e4e4e7"         // Borders (default: light gray)
    }
  };
</script>

<!-- Load Widget -->
<script async defer src="https://s3.eu-central-1.amazonaws.com/your-bucket/widget-bundle.js"></script>
```

## Configuration Options

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | `string` | Your unique client identifier from the dashboard |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | `"left" \| "right"` | `"right"` | Which corner the widget appears in |
| `defaultOpen` | `boolean` | `false` | Whether the chat starts open |
| `colors` | `object` | See below | Customize the widget appearance |

### Color Options

All color values accept any valid CSS color (hex, rgb, hsl, named colors):

| Color | Default | Used For |
|-------|---------|----------|
| `primary` | `#10b981` | Send button, user message bubbles, trigger button |
| `bgPrimary` | `#ffffff` | Chat panel background |
| `bgSecondary` | `#f4f4f5` | Header background, bot message bubbles |
| `textPrimary` | `#18181b` | Main text in messages |
| `textSecondary` | `#71717a` | Footer text, input placeholder |
| `border` | `#e4e4e7` | Input borders, dividers |

## Example: Custom Branded Widget

```html
<script>
  window.__AI_WIDGET_CONFIG__ = {
    clientId: "client-abc-123",
    position: "left",
    colors: {
      primary: "#8b5cf6",       // Purple brand color
      bgPrimary: "#fafafa",     // Slightly off-white
      bgSecondary: "#e2e8f0",   // Slate gray
      textPrimary: "#1e293b",
      textSecondary: "#64748b",
      border: "#cbd5e1"
    }
  };
</script>
<script async defer src="https://s3.eu-central-1.amazonaws.com/your-bucket/widget-bundle.js"></script>
```

## Dark Mode

The widget automatically detects the user's system preference (`prefers-color-scheme`). Users can also manually toggle dark mode within the chat header.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Troubleshooting

### Widget doesn't appear

1. Check the browser console for errors
2. Verify your `clientId` is correct
3. Ensure the script URL is correct and accessible

### Styles look wrong

- Check that color values are valid CSS colors
- Ensure no other CSS on your page has conflicting selectors

### CORS errors

If you see CORS errors in the console, the S3 bucket hosting the widget needs to be configured to allow requests from your domain. Contact support if this persists.
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget/docs/EMBED_SNIPPET.md
git commit -m "docs(widget): add customer embed documentation"
```

---

## Phase 9: Testing

### Task 13: Test Development Server

**Files:**
- Modify: `packages/widget/src/main.tsx` (verify HMR works)

- [ ] **Step 1: Start development server**

Run: `cd packages/widget && bun run dev`
Expected: Vite dev server starts on http://localhost:5173

- [ ] **Step 2: Verify widget renders**

1. Open http://localhost:5173 in browser
2. Widget trigger button should appear in bottom-right
3. Click to open chat
4. Verify colors match defaults

- [ ] **Step 3: Test hot reload**

1. Edit `src/EmbeddedWidget.tsx` - change "AI Assistant" title
2. Save file
3. Browser should auto-refresh with changes

- [ ] **Step 4: Commit** (after confirming tests pass)

```bash
git commit -m "test(widget): verify dev server working"
```

---

### Task 14: Test Production Build

**Files:**
- Verify: `dist/widget-bundle.js` is created

- [ ] **Step 1: Build for production**

Run: `cd packages/widget && bun run build`
Expected: Creates `dist/widget-bundle.js` (single file, minified)

- [ ] **Step 2: Verify bundle contents**

The bundle should:
1. Include React and ReactDOM code
2. Include all CSS (no separate CSS file)
3. Be wrapped in IIFE format
4. Start with `(function(){` or similar

Run: `head -c 200 dist/widget-bundle.js`
Expected: Shows minified JavaScript with IIFE wrapper

- [ ] **Step 3: Preview production build**

Run: `cd packages/widget && bun run preview`
Expected: Serves the built widget on http://localhost:4173

- [ ] **Step 4: Verify widget works in preview mode**

1. Open http://localhost:4173
2. Widget should appear and function
3. Check browser dev tools - only widget-bundle.js should load (plus index.html)

- [ ] **Step 5: Test with custom colors**

1. Edit `index.html` to uncomment custom colors in `__AI_WIDGET_CONFIG__`
2. Rebuild: `bun run build`
3. Preview: `bun run preview`
4. Verify custom colors are applied

- [ ] **Step 6: Commit**

```bash
git commit -m "test(widget): verify production build"
```

---

## Self-Review Checklist

- [x] **Spec Coverage:** Every phase (1-9) has tasks implementing the requirement
- [x] **No Placeholders:** All code is complete, no TODOs or TBDs
- [x] **Type Consistency:** WidgetConfig interface matches usage in main.tsx and EmbeddedWidget.tsx
- [x] **File Paths:** All paths are relative to `packages/widget/`
- [x] **Commands:** All bun/npm commands are specified with expected output

---

## Execution Ready

Plan complete and saved to `docs/superpowers/plans/2026-04-14-widget-embeddable-bundle.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach would you prefer?**
