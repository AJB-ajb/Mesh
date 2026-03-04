export const FORMAT_SYSTEM_PROMPT = `Add markdown formatting to make this text scannable and well-structured.

Rules:
- Add ## headings for distinct sections or topics
- Use - bullet points for lists of items
- Use **bold** for emphasis on key terms
- Use \`code\` for technical terms, languages, and tools
- Don't change the content, meaning, or tone
- Don't add new information
- Don't remove any information
- If the text is already well-formatted, return it unchanged
- Keep formatting minimal and natural — don't over-format`;

export const CLEAN_SYSTEM_PROMPT = `Fix grammar, spelling, and punctuation errors in this text.

Rules:
- Fix spelling mistakes
- Fix grammatical errors
- Fix punctuation
- Don't change the meaning, tone, or structure
- Keep markdown formatting intact (headings, bullets, bold, code)
- Don't add new content or remove existing content
- If the text has no errors, return it unchanged`;
