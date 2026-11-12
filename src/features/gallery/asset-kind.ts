import type { AssetKind } from "./types";

const extensions = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp"],
  video: [".mp4", ".webm", ".ogv", ".mov", ".mkv"],
  audio: [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"],
  text: [".txt", ".md", ".json", ".csv", ".xml", ".yaml", ".yml", ".log", ".js", ".ts", ".css", ".html"],
};

export function assetKind(name: string): Exclude<AssetKind, "folder"> {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  for (const kind of ["image", "video", "audio", "text"] as const) {
    if (extensions[kind].includes(extension)) return kind;
  }
  return "file";
}

export function replacementAccept(name: string) {
  const kind = assetKind(name);
  return kind === "file" ? undefined : extensions[kind].join(",");
}
