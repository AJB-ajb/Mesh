/**
 * Hidden content syntax: ||...|| for acceptance-gated content.
 * Question syntax: ||? ... || for questions asked at acceptance time.
 *
 * Inline: `Meet near ||Karlsplatz 5, 3rd floor||`
 * Block (|| on its own line):
 * ```
 * ||
 * Exact address: Karlsplatz 5
 * Zoom: https://zoom.us/j/123456
 * ||
 * ```
 *
 * Question: `||? What instrument do you play? ||`
 */

const HIDDEN_PLACEHOLDER = "\u{1F512} Details shared after acceptance";
const QUESTION_PLACEHOLDER = "\u{2753} Questions will be asked when you join";

/**
 * Regex matching ||?...|| question blocks.
 * The `?` after `||` distinguishes questions from hidden blocks.
 */
const QUESTION_RE = /\|\|\?\s*([\s\S]*?)\|\|/g;

/**
 * Regex matching ||...|| hidden content — both inline and block.
 * Uses negative lookahead `(?!\?)` to exclude ||?...|| question blocks.
 */
const HIDDEN_INLINE_RE = /\|\|(?!\?)([\s\S]*?)\|\|/g;

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

function isInsideCode(text: string, index: number): boolean {
  return isInsideCodeBlock(text, index) || isInsideInlineCode(text, index);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HiddenBlock {
  /** Start index of the opening || */
  start: number;
  /** End index (exclusive) after the closing || */
  end: number;
  /** The content between the || markers */
  content: string;
}

export interface QuestionBlock {
  /** Start index of the opening ||? */
  start: number;
  /** End index (exclusive) after the closing || */
  end: number;
  /** The question text (trimmed) */
  question: string;
}

export type QuestionMode = "placeholder" | "owner" | "strip";

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Find all ||...|| hidden blocks in the text.
 * Skips content inside code blocks and inline code.
 * Excludes ||?...|| question blocks (negative lookahead in regex).
 */
export function parseHiddenBlocks(text: string): HiddenBlock[] {
  const blocks: HiddenBlock[] = [];
  HIDDEN_INLINE_RE.lastIndex = 0;
  let match;
  while ((match = HIDDEN_INLINE_RE.exec(text))) {
    const start = match.index;
    if (isInsideCode(text, start)) {
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
 * Find all ||?...|| question blocks in the text.
 * Skips content inside code blocks and inline code.
 */
export function parseQuestionBlocks(text: string): QuestionBlock[] {
  const blocks: QuestionBlock[] = [];
  QUESTION_RE.lastIndex = 0;
  let match;
  while ((match = QUESTION_RE.exec(text))) {
    const start = match.index;
    if (isInsideCode(text, start)) {
      continue;
    }
    blocks.push({
      start,
      end: start + match[0].length,
      question: match[1].trim(),
    });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

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
    if (isInsideCode(text, offset)) {
      return fullMatch;
    }
    if (reveal) {
      return content;
    }
    return HIDDEN_PLACEHOLDER;
  });
}

/**
 * Process question content in text.
 *
 * @param mode - 'placeholder': replace with a generic message
 *               'owner': render with "Q:" prefix so poster sees their questions
 *               'strip': remove delimiters, show raw question text
 */
export function processQuestionContent(
  text: string,
  mode: QuestionMode,
): string {
  if (!text) return text;

  QUESTION_RE.lastIndex = 0;

  // For placeholder mode, replace ALL question blocks with a single message.
  // We track whether we've already inserted the placeholder.
  let placeholderInserted = false;

  return text.replace(QUESTION_RE, (fullMatch, content, offset) => {
    if (isInsideCode(text, offset)) {
      return fullMatch;
    }
    switch (mode) {
      case "placeholder":
        if (placeholderInserted) return "";
        placeholderInserted = true;
        return QUESTION_PLACEHOLDER;
      case "owner":
        return `**Q:** ${(content as string).trim()}`;
      case "strip":
        return (content as string).trim();
    }
  });
}

/**
 * Combined processor for both ||hidden|| and ||?question|| syntax.
 * Processes questions first, then hidden content.
 */
export function processAllSyntax(
  text: string,
  options: { revealHidden?: boolean; questionMode?: QuestionMode },
): string {
  if (!text) return text;

  const { revealHidden = false, questionMode = "placeholder" } = options;

  // Process questions first (so ||?...|| is handled before hidden regex)
  let result = processQuestionContent(text, questionMode);
  // Then process hidden content
  result = processHiddenContent(result, revealHidden);
  return result;
}
