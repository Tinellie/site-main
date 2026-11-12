import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/db";
import { recordPostImages } from "@/lib/images/reference-store";
import { withContentWriteLock } from "@/lib/content-write-lock";

const POST_FILE_NAME = /^([1-9]\d*)\.md$/;
const SUMMARY_LENGTH = 140;

const BLOG_STORAGE_ROOT = path.join(process.cwd(), "content", "blog");
const BLOG_HISTORY_ROOT = path.join(BLOG_STORAGE_ROOT, "history");
const BLOG_ASSET_ROOT = path.join(process.cwd(), "public", "assets");

export interface BlogPostMetadata {
  id: number;
  title: string;
  coverImage: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  summary: string;
}

export interface BlogPost extends BlogPostMetadata {
  content: string;
}

export interface SavePostInput {
  id: number;
  title: string;
  coverImage: string;
  tags: string[];
  content: string;
}

interface StoredFrontMatter {
  id?: unknown;
  title?: unknown;
  coverImage?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  tags?: unknown;
  summary?: unknown;
}

function toIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}

function normalizeTimestampForFileName(timestamp: string): string {
  const safe = timestamp.replaceAll(":", "-");
  return safe.endsWith("Z") ? safe : `${safe}Z`;
}

function sanitizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function normalizeCoverImagePath(coverImage: string): string {
  const trimmed = coverImage.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed).href;
  }

  let relative = trimmed;
  if (trimmed.startsWith("/assets/")) {
    relative = trimmed.slice("/assets/".length);
  } else if (trimmed.startsWith("/images/assets/")) {
    relative = trimmed.slice("/images/assets/".length);
  } else if (trimmed.startsWith("assets/")) {
    relative = trimmed.slice("assets/".length);
  } else if (trimmed.startsWith("/")) {
    throw new Error("封面图仅支持 assets 目录内路径。");
  }

  const safeRelative = validateAssetRelativePath(relative);
  return `/assets/${safeRelative}`;
}

function firstMarkdownImage(markdown: string): string {
  const text = markdown
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, "")
    .replace(/(`+)[\s\S]*?\1/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const destination = /^(?:<([^>\n]+)>|((?:\\.|[^()\s]|\([^()\n]*\))+))/;
  const references = new Map<string, string>();
  const labelKey = (label: string) => label.trim().replace(/\s+/g, " ").toLowerCase();
  for (const match of text.matchAll(/^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(.+)$/gm)) {
    const url = destination.exec(match[2]);
    if (url && !references.has(labelKey(match[1]))) {
      references.set(labelKey(match[1]), url[1] ?? url[2]);
    }
  }
  for (const match of text.matchAll(/(?<!\\)!\[((?:\\.|[^\]\\])*)\](?:\(\s*(<[^>\n]+>|(?:\\.|[^()\s]|\([^()\n]*\))+)(?:\s+["'][^"']*["'])?\s*\)|\[([^\]]*)\])?/g)) {
    const url = match[2]
      ? match[2].replace(/^<|>$/g, "")
      : references.get(labelKey(match[3] || match[1]));
    if (url) return url.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, "$1");
  }
  return "";
}

function resolveCoverImage(coverImage: string, markdown: string): string {
  return normalizeCoverImagePath(
    coverImage.trim() === "$$" ? firstMarkdownImage(markdown) : coverImage,
  );
}

function validateId(id: number): void {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("文章 id 必须是正整数。");
  }
}

function buildPostFilePath(id: number): string {
  return path.join(BLOG_STORAGE_ROOT, `${id}.md`);
}

function parseStoredPost(source: string): BlogPost {
  const parsed = matter(source);
  const data = parsed.data as StoredFrontMatter;
  const id = typeof data.id === "number" ? data.id : Number(data.id);

  if (!Number.isInteger(id) || id < 1) {
    throw new Error("文章 front matter 缺少有效 id。");
  }
  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("文章 front matter 缺少标题。");
  }
  if (typeof data.publishedAt !== "string" || !data.publishedAt.trim()) {
    throw new Error("文章 front matter 缺少发布时间。");
  }
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  const updatedAt =
    typeof data.updatedAt === "string" && data.updatedAt.trim()
      ? data.updatedAt
      : "";

  return {
    id,
    title: data.title.trim(),
    coverImage:
      typeof data.coverImage === "string"
        ? normalizeCoverImagePath(data.coverImage)
        : "",
    publishedAt: data.publishedAt,
    updatedAt,
    tags,
    summary:
      typeof data.summary === "string" && data.summary.trim()
        ? data.summary
        : buildSummary(parsed.content),
    content: parsed.content,
  };
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/!\[[^\]]*]\([^)]+\)/g, "[图片]")
    .replaceAll(/\[[^\]]*]\(([^)]+)\)/g, (_full, link) => String(link))
    .replaceAll(/```[\s\S]*?```/g, " ")
    .replaceAll(/`[^`]+`/g, " ")
    .replaceAll(/^#{1,6}\s+/gm, "")
    .replaceAll(/[*_~>-]+/g, " ")
    .replaceAll(/\n+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function buildSummary(markdown: string): string {
  const text = stripMarkdown(markdown);
  return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH)}…` : text;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureBlogDirectories(): Promise<void> {
  await Promise.all([
    fs.mkdir(BLOG_STORAGE_ROOT, { recursive: true }),
    fs.mkdir(BLOG_HISTORY_ROOT, { recursive: true }),
    fs.mkdir(BLOG_ASSET_ROOT, { recursive: true }),
  ]);
}

export async function listPostSummaries(): Promise<BlogPostMetadata[]> {
  await ensureBlogDirectories();
  const entries = await fs.readdir(BLOG_STORAGE_ROOT, { withFileTypes: true });
  const postFiles = entries.filter((entry) => (
    entry.isFile() && POST_FILE_NAME.test(entry.name)
  ));

  const posts = await Promise.all(
    postFiles.map(async (entry) => {
      const source = await fs.readFile(
        path.join(BLOG_STORAGE_ROOT, entry.name),
        "utf8",
      );
      const post = parseStoredPost(source);
      return {
        id: post.id,
        title: post.title,
        coverImage: post.coverImage,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        tags: post.tags,
        summary: post.summary,
      } satisfies BlogPostMetadata;
    }),
  );

  return posts.sort((a, b) => b.id - a.id);
}

export async function getPostById(id: number): Promise<BlogPost | null> {
  validateId(id);
  await ensureBlogDirectories();
  const filePath = buildPostFilePath(id);
  if (!(await fileExists(filePath))) return null;
  const source = await fs.readFile(filePath, "utf8");
  return parseStoredPost(source);
}

export async function getNextPostId(): Promise<number> {
  await ensureBlogDirectories();
  const entries = await fs.readdir(BLOG_STORAGE_ROOT, { withFileTypes: true });
  let maxId = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = POST_FILE_NAME.exec(entry.name);
    if (!match) continue;
    const id = Number(match[1]);
    if (Number.isInteger(id) && id > maxId) {
      maxId = id;
    }
  }
  return maxId + 1;
}

export async function savePost(input: SavePostInput): Promise<BlogPost> {
  await requireEditor();
  return withContentWriteLock(() => savePostWithReferences(input));
}

async function savePostWithReferences(input: SavePostInput): Promise<BlogPost> {
  validateId(input.id);
  const title = input.title.trim();
  if (!title) {
    throw new Error("标题不能为空。");
  }

  await ensureBlogDirectories();

  const filePath = buildPostFilePath(input.id);
  const exists = await fileExists(filePath);
  const now = toIsoTimestamp();
  const tags = sanitizeTags(input.tags);
  const coverImage = resolveCoverImage(input.coverImage, input.content);
  const summary = buildSummary(input.content);
  let publishedAt = now;
  let archivedPath: string | undefined;

  if (exists) {
    const previousSource = await fs.readFile(filePath, "utf8");
    const previousPost = parseStoredPost(previousSource);
    publishedAt = previousPost.publishedAt;
    const versionTimestamp = normalizeTimestampForFileName(
      previousPost.updatedAt || previousPost.publishedAt,
    );
    const historyDir = path.join(BLOG_HISTORY_ROOT, String(input.id));
    await fs.mkdir(historyDir, { recursive: true });
    let historyPath = path.join(historyDir, `${versionTimestamp}.md`);
    if (await fileExists(historyPath)) {
      historyPath = path.join(historyDir, `${versionTimestamp}-${randomUUID()}.md`);
    }
    await fs.rename(filePath, historyPath);
    archivedPath = historyPath;
  }

  const frontMatter = {
    id: input.id,
    title,
    coverImage,
    publishedAt,
    updatedAt: exists ? now : "",
    tags,
    summary,
  };

  const source = matter.stringify(input.content, frontMatter);
  try {
    await getDb().transaction(async tx => {
      await recordPostImages(tx, { id: input.id, title, coverImage, content: input.content });
      await fs.writeFile(filePath, source, "utf8");
    });
  } catch (error) {
    try {
      if (archivedPath) await fs.copyFile(archivedPath, filePath);
      else await fs.rm(filePath, { force: true });
    } catch (rollbackError) {
      console.error("Article save rollback failed:", rollbackError);
      throw new Error("文章保存及回滚失败，请检查文章与数据库状态。", { cause: error });
    }
    throw error;
  }

  return {
    id: input.id,
    title,
    coverImage,
    publishedAt,
    updatedAt: exists ? now : "",
    tags,
    summary,
    content: input.content,
  };
}

function decodeUrlPathSegment(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    throw new Error("图片路径编码无效。");
  }
}

function ensureRelativeSegments(relativePath: string): string[] {
  const normalized = relativePath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("图片路径必须是 assets 目录下的相对路径，且不能返回上级目录。");
  }
  return segments;
}

export function validateAssetRelativePath(relativePath: string): string {
  const segments = ensureRelativeSegments(relativePath);
  const decodedSegments = segments.map(decodeUrlPathSegment);
  if (decodedSegments.some((segment) => /[\u0000-\u001f:*?"<>|]/.test(segment))) {
    throw new Error("图片路径包含非法字符。");
  }
  return decodedSegments.join("/");
}

export async function writeUploadedAsset(file: File): Promise<string> {
  await requireEditor();
  const originalName = file.name || "image";
  const extension = path.extname(originalName).toLowerCase() || ".png";
  const baseName = path.basename(originalName, extension) || "image";
  const safeName = `${baseName.replaceAll(/[^a-zA-Z0-9-_]+/g, "-")}-${Date.now()}${extension}`;
  const relativePath = validateAssetRelativePath(safeName);
  const destinationPath = path.join(BLOG_ASSET_ROOT, relativePath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  const data = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destinationPath, data);
  return `/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export async function renameAssetFile(
  sourceRelativePath: string,
  targetRelativePath: string,
): Promise<string> {
  const { moveManagedAsset } = await import("@/lib/gallery/file-manager");
  const relative = await moveManagedAsset(sourceRelativePath, targetRelativePath);
  return `/assets/${relative.split("/").map(encodeURIComponent).join("/")}`;
}
