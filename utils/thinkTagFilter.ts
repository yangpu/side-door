/**
 * Remove <think>...</think> tags from text and return only content after </think>
 * @param text - The input text that may contain <think> tags
 * @returns Text with <think> tags removed
 */
export function removeThinkTags(text: string): string {
  if (!text) return text;
  
  // Remove <think>...</think> tags and their content
  // This regex handles both single-line and multi-line think tags
  const thinkTagRegex = /<think>[\s\S]*?<\/think>\s*/gi;
  
  return text.replace(thinkTagRegex, '').trim();
}
