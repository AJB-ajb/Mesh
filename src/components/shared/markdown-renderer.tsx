"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";
import { isMeshUrl } from "@/lib/mesh-links";
import { processHiddenContent } from "@/lib/hidden-syntax";

type MarkdownRendererProps = {
  content: string;
  className?: string;
  clamp?: number;
  /** If true, reveal ||hidden|| content. Default false (show placeholder). */
  revealHidden?: boolean;
};

type C = { children?: ReactNode };
type A = { href?: string; children?: ReactNode };

const components: Components = {
  // Allowed elements with styling
  h1: ({ children }: C) => (
    <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
  ),
  h2: ({ children }: C) => (
    <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }: C) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  h4: ({ children }: C) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  h5: ({ children }: C) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  h6: ({ children }: C) => (
    <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }: C) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: C) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: C) => <em>{children}</em>,
  ul: ({ children }: C) => (
    <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: C) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: C) => <li>{children}</li>,
  code: ({ children }: C) => (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
      {children}
    </code>
  ),
  a: ({ href, children }: A) => {
    if (href && isMeshUrl(href)) {
      return (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-sm font-medium">
          {children}
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {children}
      </a>
    );
  },
  // Stripped elements - render children only (no wrapper)
  table: ({ children }: C) => <>{children}</>,
  thead: ({ children }: C) => <>{children}</>,
  tbody: ({ children }: C) => <>{children}</>,
  tr: ({ children }: C) => <>{children}</>,
  th: ({ children }: C) => <>{children}</>,
  td: ({ children }: C) => <>{children}</>,
  img: () => null,
  hr: () => null,
  pre: ({ children }: C) => <>{children}</>,
  blockquote: ({ children }: C) => <>{children}</>,
};

export function MarkdownRenderer({
  content,
  className,
  clamp,
  revealHidden = false,
}: MarkdownRendererProps) {
  if (!content?.trim()) return null;

  const processed = processHiddenContent(content, revealHidden);
  const clampClass = clamp ? `line-clamp-${clamp}` : "";

  return (
    <div className={`markdown-content ${clampClass} ${className ?? ""}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}
