import path from "node:path";

export async function availableAssetName(
  requested: string, occupied: (name: string) => Promise<boolean>, directory = false,
) {
  const extension = directory ? "" : path.posix.extname(requested);
  const base = requested.slice(0, requested.length - extension.length);
  let candidate = requested;
  for (let number = 1; await occupied(candidate); number++) {
    candidate = `${base}(${number})${extension}`;
  }
  return candidate;
}
