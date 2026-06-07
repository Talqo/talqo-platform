import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

type WidgetMarkdownContentProps = {
	content: string
}

export function WidgetMarkdownContent({ content }: WidgetMarkdownContentProps) {
	return (
		<div className="aiw-markdown">
			<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
				{content}
			</ReactMarkdown>
		</div>
	)
}
