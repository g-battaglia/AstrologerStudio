import { Components } from 'react-markdown'

export const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-4 pb-2 border-b">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-foreground mt-5 mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-2xl font-semibold text-foreground mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold text-foreground mt-3 mb-2">{children}</h4>,
  p: ({ children }) => <p className="text-foreground leading-relaxed mb-4">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-outside space-y-2 mb-4 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside space-y-2 mb-4 pl-5">{children}</ol>,
  li: ({ children }) => <li className="text-foreground leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse border border-border rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50 dark:bg-muted">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-3 text-sm text-foreground border-b border-border">{children}</td>,
  code: ({ children, className }) => {
    const isInline = !className
    return isInline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">{children}</code>
    ) : (
      <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">{children}</code>
    )
  },
  hr: () => <hr className="my-6 border-border" />,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}
