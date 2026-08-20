const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Divide un mensaje largo en trozos <= 4096 chars, cortando por saltos de
 * línea cuando es posible.
 */
export const splitMessage = (text: string): string[] => {
  if (text.length <= TELEGRAM_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_MAX_LENGTH) {
    let cutAt = remaining.lastIndexOf("\n", TELEGRAM_MAX_LENGTH);
    if (cutAt <= 0) cutAt = TELEGRAM_MAX_LENGTH;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).replace(/^\n+/, "");
  }
  if (remaining) chunks.push(remaining);

  return chunks;
};
