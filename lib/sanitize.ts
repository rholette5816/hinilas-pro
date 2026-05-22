export function sanitizePrompt(input: string): string {
  return input
    .trim()
    .slice(0, 5000)
    .replace(/ignore previous instructions?/gi, "")
    .replace(/forget (everything|all|prior)/gi, "")
    .replace(/you are now/gi, "")
    .replace(/act as (a |an )?(?!filipino|philippine)/gi, "")
    .replace(/system prompt/gi, "")
    .replace(/\[INST\]|\[\/INST\]/g, "")
    .replace(/<\|.*?\|>/g, "");
}
