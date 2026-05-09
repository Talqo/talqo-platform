import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

const REMARK_PLUGINS = [remarkGfm, remarkBreaks]

type MarkdownContentProps = {
	content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
	return (
		<div className="prose prose-sm dark:prose-invert max-w-none">
			<ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{content}</ReactMarkdown>
		</div>
	)
}
