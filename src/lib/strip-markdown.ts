/**
 * Strip markdown syntax for plain-text previews (e.g. space list items).
 * Intentionally simple — covers the subset supported by MarkdownRenderer.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Headings: "## Foo" → "Foo"
      .replace(/^#{1,6}\s+/gm, "")
      // Bold/italic: **bold**, *italic*, __bold__, _italic_
      .replace(/(\*{1,2}|_{1,2})(.+?)\1/g, "$2")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
      // Images: ![alt](url) → alt  (must come before links)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Links: [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Unordered list markers: "- item" or "* item"
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // Ordered list markers: "1. item"
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Hidden syntax: ||hidden|| → "" , ||?question|| → "question"
      .replace(/\|\|\?([^|]*)\|\|/g, "$1")
      .replace(/\|\|[^|]*\|\|/g, "")
      // Collapse multiple spaces/newlines
      .replace(/\s+/g, " ")
      .trim()
  );
}
