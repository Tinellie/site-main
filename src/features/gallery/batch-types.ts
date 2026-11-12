import type { AssetUsage } from "./types";

export type ConflictPolicy = "skip" | "overwrite" | "number";
export type FolderPolicy = ConflictPolicy | "merge";
export interface BatchInput {
  action: "copy" | "move" | "delete" | "rename";
  paths: string[];
  destination: string;
  target?: string;
  filePolicy?: ConflictPolicy;
  folderPolicy?: FolderPolicy;
  confirmReferences?: boolean;
}
export interface BatchResult {
  completed: boolean;
  conflicts?: { files: number; folders: number };
  usage?: AssetUsage;
  skipped?: string[];
}
