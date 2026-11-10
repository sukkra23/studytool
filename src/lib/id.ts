/** Random id that also works on file:// pages where crypto.randomUUID may be missing. */
export function uid(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
