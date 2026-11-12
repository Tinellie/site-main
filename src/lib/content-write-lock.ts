import "server-only";

const state = globalThis as typeof globalThis & { contentWriteQueue?: Promise<void> };

export async function withContentWriteLock<T>(write: () => Promise<T>): Promise<T> {
  const previous = state.contentWriteQueue ?? Promise.resolve();
  let release!: () => void;
  state.contentWriteQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { return await write(); } finally { release(); }
}
