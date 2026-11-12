export type AssetKind = "folder" | "image" | "video" | "audio" | "text" | "file";

export interface AssetUsage {
  connect: boolean;
  works: boolean;
  articles: { id: number; title: string }[];
}

export interface AssetEntry {
  name: string;
  kind: AssetKind;
  url: string;
  size: number;
  modifiedAt: string;
}
