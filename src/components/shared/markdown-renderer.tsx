"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";

type MarkdownRendererProps = {
  content: string;
  className?: string;
  clamp?: number;
};

const components: Components = {
  // Allowed elements with styling
  h1: ({ children }) => (
    <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  h4: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  h5: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  h6: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  // Stripped elements - render children only (no wrapper)
  table: ({ children }) => <>{children}</>,
  thead: ({ children }) => <>{children}</>,
  tbody: ({ children }) => <>{children}</>,
  tr: ({ children }) => <>{children}</>,
  th: ({ children }) => <>{children}</>,
  td: ({ children }) => <>{children}</>,
  img: () => null,
  hr: () => null,
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <>{children}</>,
};

export function MarkdownRenderer({
  content,
  className,
  clamp,
}: MarkdownRendererProps) {
  if (!content?.trim()) return null;

  const clampClass = clamp ? `line-clamp-${clamp}` : "";

  return (
    <div className={`markdown-content ${clampClass} ${className ?? ""}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
