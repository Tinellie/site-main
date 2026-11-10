export function formatPostTimestamp(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace("T", " ");
}
