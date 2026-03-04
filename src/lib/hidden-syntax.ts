/**
 * Hidden content syntax: ||...|| for acceptance-gated content.
 *
 * Inline: `Meet near ||Karlsplatz 5, 3rd floor||`
 * Block (|| on its own line):
 * ```
 * ||
 * Exact address: Karlsplatz 5
 * Zoom: https://zoom.us/j/123456
 * ||
 * ```
 */

const HIDDEN_PLACEHOLDER = "\u{1F512} Details shared after acceptance";

/**
 * Regex matching ||...|| content — both inline and block.
 * Uses a non-greedy match to handle multiple hidden regions.
 * Avoids matching inside code blocks (``` or `).
 */
const HIDDEN_INLINE_RE = /\|\|([\s\S]*?)\|\|/g;

/**
 * Check if a position is inside a fenced code block.
 */
function isInsideCodeBlock(text: string, index: number): boolean {
  // Count triple backtick fences before this position
  let fenceCount = 0;
  let i = 0;
  while (i < index) {
    if (text[i] === "`" && text[i + 1] === "`" && text[i + 2] === "`") {
      fenceCount++;
      i += 3;
    } else {
      i++;
    }
  }
  // Odd number of fences means we're inside a code block
  return fenceCount % 2 === 1;
}

/**
 * Check if a position is inside an inline code span.
 */
function isInsideInlineCode(text: string, index: number): boolean {
  // Count unescaped backticks before this position (excluding triple backticks)
  let inCode = false;
  let i = 0;
  while (i < index) {
    if (text[i] === "`") {
      // Skip triple backticks (those are fenced code blocks, handled separately)
      if (text[i + 1] === "`" && text[i + 2] === "`") {
        // Skip until closing ```
        i += 3;
        while (i < text.length) {
          if (text[i] === "`" && text[i + 1] === "`" && text[i + 2] === "`") {
            i += 3;
            break;
          }
          i++;
        }
        continue;
      }
      inCode = !inCode;
    }
    i++;
  }
  return inCode;
}

export interface HiddenBlock {
  /** Start index of the opening || */
  start: number;
  /** End index (exclusive) after the closing || */
  end: number;
  /** The content between the || markers */
  content: string;
}

/**
 * Find all ||...|| hidden blocks in the text.
 * Skips content inside code blocks and inline code.
 */
export function parseHiddenBlocks(text: string): HiddenBlock[] {
  const blocks: HiddenBlock[] = [];
  HIDDEN_INLINE_RE.lastIndex = 0;
  let match;
  while ((match = HIDDEN_INLINE_RE.exec(text))) {
    const start = match.index;
    if (isInsideCodeBlock(text, start) || isInsideInlineCode(text, start)) {
      continue;
    }
    blocks.push({
      start,
      end: start + match[0].length,
      content: match[1],
    });
  }
  return blocks;
}

/**
 * Process hidden content in text.
 *
 * @param text - The markdown text containing ||...|| blocks
 * @param reveal - If true, strip || delimiters and show content.
 *                 If false, replace hidden regions with placeholder.
 */
export function processHiddenContent(text: string, reveal: boolean): string {
  if (!text) return text;

  HIDDEN_INLINE_RE.lastIndex = 0;
  return text.replace(HIDDEN_INLINE_RE, (fullMatch, content, offset) => {
    // Don't process inside code blocks
    if (isInsideCodeBlock(text, offset) || isInsideInlineCode(text, offset)) {
      return fullMatch;
    }
    if (reveal) {
      return content;
    }
    return HIDDEN_PLACEHOLDER;
  });
}
