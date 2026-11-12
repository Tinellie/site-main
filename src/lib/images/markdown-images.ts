import { fromMarkdown } from "mdast-util-from-markdown";
import { decodeString } from "micromark-util-decode-string";

interface ImageDestination { start: number; end: number; url: string }
interface MarkdownNode {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: MarkdownNode[];
  identifier?: string;
}

export function unescapeImageUrl(url: string): string {
  return decodeString(url);
}

function destination(markdown: string, node: MarkdownNode): ImageDestination | null {
  const offset = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (offset === undefined || end === undefined) return null;
  const raw = markdown.slice(offset, end);
  let at = node.type === "image" ? 2 : 1;
  let depth = 1;
  for (; at < raw.length && depth; at++) {
    if (raw[at] === "\\") at++;
    else if (raw[at] === "[") depth++;
    else if (raw[at] === "]") depth--;
  }
  at++; // Skip the resource's opening parenthesis or the definition's colon.
  while (at < raw.length && (/\s/.test(raw[at]) || (node.type === "definition" && raw[at] === ">"))) at++;
  const angle = raw[at] === "<";
  if (angle) at++;
  const start = at;
  depth = 0;
  for (; at < raw.length; at++) {
    const char = raw[at];
    if (char === "\\") { at++; continue; }
    if (angle ? char === ">" : depth === 0 && (/\s/.test(char) || char === ")")) break;
    if (!angle && char === "(") depth++;
    if (!angle && char === ")") depth--;
  }
  return { start: offset + start, end: offset + at, url: raw.slice(start, at) };
}

function htmlImages(text: string, offset: number): ImageDestination[] {
  const result: ImageDestination[] = [];
  const visible = text.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
    match => " ".repeat(match.length));
  for (const tag of visible.matchAll(/<(?:img|source)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    for (const match of tag[0].matchAll(/\s+([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      if (!/^(src|srcset)$/i.test(match[1])) continue;
      const value = match[2] ?? match[3] ?? match[4];
      const valueOffset = tag.index + match.index + match[0].indexOf("=") + 1;
      const start = offset + valueOffset + text.slice(valueOffset).indexOf(value);
      if (match[1].toLowerCase() === "srcset") {
        let at = 0;
        while (at < value.length) {
          while (at < value.length && /[\s,]/.test(value[at])) at++;
          const begin = at;
          while (at < value.length && !/\s/.test(value[at])) at++;
          let end = at;
          while (value[end - 1] === ",") end--;
          if (end > begin) result.push({ start: start + begin, end: start + end, url: value.slice(begin, end) });
          if (end < at) continue;
          let parentheses = 0;
          while (at < value.length) {
            const char = value[at++];
            if (char === "(") parentheses++;
            if (char === ")") parentheses--;
            if (char === "," && parentheses === 0) break;
          }
        }
      } else result.push({ start, end: start + value.length, url: value });
    }
  }
  return result;
}

export function markdownImages(markdown: string): ImageDestination[] {
  const result: ImageDestination[] = [];
  const references = new Set<string>();
  const definitions = new Map<string, MarkdownNode>();
  function visit(node: MarkdownNode) {
    if (node.type === "image") {
      const image = destination(markdown, node);
      if (image) result.push(image);
    } else if (node.type === "imageReference" && node.identifier) {
      references.add(node.identifier);
    } else if (node.type === "definition" && node.identifier && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node);
    } else if (node.type === "html" && node.position?.start.offset !== undefined) {
      const start = node.position.start.offset;
      result.push(...htmlImages(markdown.slice(start, node.position.end.offset), start));
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(fromMarkdown(markdown));
  for (const identifier of references) {
    const node = definitions.get(identifier);
    const image = node && destination(markdown, node);
    if (image) result.push(image);
  }
  return result.sort((a, b) => a.start - b.start);
}

export function rewriteMarkdownImages(markdown: string, replacement: (url: string) => string | null): string {
  for (const image of markdownImages(markdown).sort((a, b) => b.start - a.start)) {
    const target = replacement(image.url);
    if (target !== null) markdown = markdown.slice(0, image.start) + target + markdown.slice(image.end);
  }
  return markdown;
}
