import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BatchInput, BatchResult } from "@/features/gallery/batch-types";
import { AuthError } from "@/lib/auth/http";
import { requireEditor } from "@/lib/auth/session";
import { withContentWriteLock } from "@/lib/content-write-lock";
import { assetRoot, inspectAssetPath, isMissingFile, validatedAssetPath } from "./file-paths";
import { availableAssetName } from "./available-name";
import { affectedAssetUsage, withAssetReferenceMoves } from "./reference-moves";

export function parseBatchInput(value: unknown): BatchInput {
  if (!value || typeof value !== "object" || !("action" in value) ||
    !["copy", "move", "delete", "rename"].includes(String(value.action)) ||
    !("paths" in value) || !Array.isArray(value.paths) || !value.paths.length || value.paths.length > 200 ||
    !("destination" in value) || typeof value.destination !== "string") {
    throw new AuthError("批量文件操作格式无效（最多选择 200 项）。", 400);
  }
  const action = value.action;
  if (action !== "copy" && action !== "move" && action !== "delete" && action !== "rename") {
    throw new AuthError("操作无效。", 400);
  }
  const paths = [...new Set(value.paths.map(item => validatedAssetPath(item)))];
  const destination = value.destination ? validatedAssetPath(value.destination) : "";
  const filePolicy = "filePolicy" in value ? value.filePolicy : undefined;
  const folderPolicy = "folderPolicy" in value ? value.folderPolicy : undefined;
  if (filePolicy !== undefined && filePolicy !== "skip" && filePolicy !== "overwrite" && filePolicy !== "number") {
    throw new AuthError("文件冲突策略无效。", 400);
  }
  if (folderPolicy !== undefined && folderPolicy !== "merge" && folderPolicy !== "skip" &&
    folderPolicy !== "overwrite" && folderPolicy !== "number") {
    throw new AuthError("文件夹冲突策略无效。", 400);
  }
  const target = "target" in value ? validatedAssetPath(value.target) : undefined;
  if (action === "rename" && (paths.length !== 1 || !target ||
    path.posix.dirname(paths[0]) !== path.posix.dirname(target))) {
    throw new AuthError("文件夹重命名必须保留原父目录。", 400);
  }
  return { action, paths, destination, target, filePolicy, folderPolicy,
    confirmReferences: "confirmReferences" in value && value.confirmReferences === true };
}

interface Tree { name: string; directory: boolean; children: Tree[] }
interface Transfer { from: string; to: string; tree: Tree; overwrite: boolean }
const inside = (value: string, parent: string) => value === parent || value.startsWith(`${parent}/`);
const absolute = (relative: string) => path.join(assetRoot, ...relative.split("/"));

async function nodeAt(relative: string) {
  const info = await inspectAssetPath(relative, false, true);
  if (!info.exists) return null;
  const stat = await fs.lstat(info.absolute);
  if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) {
    throw new AuthError("不允许操作符号链接或特殊文件。", 400);
  }
  return { directory: stat.isDirectory() };
}

async function readTree(relative: string, budget: { count: number }, depth = 0): Promise<Tree> {
  if (++budget.count > 10_000 || depth > 64) throw new AuthError("操作超过 10000 个节点或 64 层目录，请分批处理。", 400);
  const node = await nodeAt(relative);
  if (!node) throw new AuthError("文件或文件夹不存在，请刷新后重试。", 404);
  const children: Tree[] = [];
  if (node.directory) {
    for (const name of (await fs.readdir(absolute(relative))).sort()) {
      children.push(await readTree(validatedAssetPath(`${relative}/${name}`), budget, depth + 1));
    }
  }
  return { name: path.posix.basename(relative), directory: node.directory, children };
}

function filesIn(tree: Tree, relative: string): string[] {
  return tree.directory ? tree.children.flatMap(child => filesIn(child, `${relative}/${child.name}`)) : [relative];
}

async function removeKnownTree(file: string) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink()) throw new Error("Refusing to clean up a symbolic link.");
  if (stat.isDirectory()) {
    for (const name of await fs.readdir(file)) await removeKnownTree(path.join(file, name));
    await fs.rmdir(file);
  } else if (stat.isFile()) await fs.unlink(file);
  else throw new Error("Refusing to clean up a special file.");
}

export async function batchAssets(input: BatchInput): Promise<BatchResult> {
  await requireEditor();
  return withContentWriteLock(async () => {
    const sources = input.paths.filter(value => !input.paths.some(parent => parent !== value && inside(value, parent)));
    if (input.action !== "delete" && input.action !== "rename") {
      if (sources.some(source => input.destination && inside(input.destination, source))) {
        throw new AuthError("不能将项目粘贴到自身或自己的子目录。", 400);
      }
      if (input.destination && !(await nodeAt(input.destination))?.directory) {
        throw new AuthError("目标文件夹不存在。", 404);
      }
    }
    const budget = { count: 0 };
    const trees = await Promise.all(sources.map(source => readTree(source, budget)));
    if (input.action === "rename" && !trees[0].directory) throw new AuthError("此操作仅用于文件夹。", 400);
    const transfers: Transfer[] = [];
    const emptied: string[] = [];
    const skipped: string[] = [];
    const conflicts = { files: 0, folders: 0 };
    const occupied = new Map<string, { directory: boolean }>();
    const moves = new Map<string, string>();
    const removed: string[] = [];
    let unresolved = false;
    const find = async (name: string) => occupied.get(name) ?? await nodeAt(name);
    async function plan(tree: Tree, from: string, requested: string) {
      let to = requested;
      const existing = await find(to);
      if (existing) {
        const folderConflict = tree.directory || existing.directory;
        if (folderConflict) conflicts.folders++; else conflicts.files++;
        const policy = folderConflict ? input.folderPolicy : input.filePolicy;
        if (!policy) { unresolved = true; return; }
        if (policy === "skip") { skipped.push(from); return; }
        if (policy === "number") {
          to = await availableAssetName(to, async name => !!(await find(name)), tree.directory);
        } else if (policy === "merge") {
          if (occupied.has(to)) throw new AuthError("多个源文件夹映射到同一目标，请选择编号或分批操作。", 409);
          if (!tree.directory || !existing.directory) {
            throw new AuthError("文件与文件夹同名时不能合并，请选择其他文件夹冲突策略。", 409);
          }
          if (from === to) throw new AuthError("不能合并自身。", 400);
          for (const child of tree.children) await plan(child, `${from}/${child.name}`, `${to}/${child.name}`);
          emptied.push(from);
          return;
        } else {
          if (sources.some(source => inside(to, source) || inside(source, to))) {
            throw new AuthError("不能覆盖本次选择的源项目，请使用编号或跳过。", 400);
          }
          if (occupied.has(to)) throw new AuthError("多个源项目映射到同一目标，请使用编号。", 409);
          const targetTree = await readTree(to, budget);
          const replacements = new Set(filesIn(tree, to));
          // Same-path references keep pointing to replacement bytes; warn for paths that disappear.
          removed.push(...filesIn(targetTree, to).filter(name => !replacements.has(name)));
        }
      }
      if (from === to) throw new AuthError("目标与源路径相同，请选择编号或其他目录。", 400);
      occupied.set(to, { directory: tree.directory });
      transfers.push({ from, to, tree, overwrite: !!existing && to === requested });
      if (input.action !== "copy") {
        const before = filesIn(tree, from);
        const after = filesIn(tree, to);
        before.forEach((value, index) => moves.set(value, after[index]));
      }
    }
    if (input.action === "delete") trees.forEach((tree, index) => removed.push(...filesIn(tree, sources[index])));
    else for (const [index, tree] of trees.entries()) {
      await plan(tree, sources[index], input.action === "rename" ? input.target! :
        [input.destination, tree.name].filter(Boolean).join("/"));
    }
    if (unresolved) return { completed: false, conflicts };
    const usage = await affectedAssetUsage(removed);
    if (!input.confirmReferences && (usage.connect || usage.works || usage.articles.length)) {
      return { completed: false, usage };
    }
    const staging = path.join(assetRoot, `.gallery-operation-${randomUUID()}`);
    await fs.mkdir(staging, { mode: 0o700 });
    const undo: (() => Promise<void>)[] = [];
    let stashId = 0;
    async function stash(file: string) {
      const saved = path.join(staging, String(++stashId));
      await fs.rename(file, saved);
      undo.push(() => fs.rename(saved, file));
    }
    try {
      await withAssetReferenceMoves(moves, async () => {
        if (input.action === "delete") {
          for (const source of sources) await stash(absolute(source));
        } else {
          for (const transfer of transfers) {
            const from = absolute(transfer.from), to = absolute(transfer.to);
            if (transfer.overwrite) await stash(to);
            if (input.action === "copy") {
              // Register cleanup before copying so partial copies are also compensated.
              undo.push(async () => {
                try { await removeKnownTree(to); } catch (error) { if (!isMissingFile(error)) throw error; }
              });
              await fs.cp(from, to, { recursive: transfer.tree.directory, errorOnExist: true, force: false });
            } else {
              await fs.rename(from, to);
              undo.push(() => fs.rename(to, from));
            }
          }
          if (input.action !== "copy") {
            for (const folder of emptied) {
              if (!(await fs.readdir(absolute(folder))).length) {
                await fs.rmdir(absolute(folder));
                undo.push(() => fs.mkdir(absolute(folder)));
              }
            }
          }
        }
      });
    } catch (error) {
      try {
        for (const compensate of undo.reverse()) await compensate();
        await removeKnownTree(staging);
      } catch (rollbackError) {
        console.error("Gallery batch rollback failed:", rollbackError);
        throw new Error("文件操作及回滚失败，请检查保留的操作备份。", { cause: error });
      }
      throw error;
    }
    try { await removeKnownTree(staging); }
    catch (error) {
      console.error("Gallery operation committed but cleanup failed:", error);
      throw new Error("文件操作已完成，但临时备份清理失败，请刷新并检查服务器日志。", { cause: error });
    }
    return { completed: true, skipped };
  });
}
