export type AssetKind = "folder" | "image" | "video" | "audio" | "text" | "file";

export interface AssetEntry {
  name: string;
  kind: AssetKind;
  url: string;
  size: number;
  modifiedAt: string;
}
