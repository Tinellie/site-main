import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { connectCategories, contentCards } from "@/db/schema";
import type { CardInput, CardSection } from "@/features/cards/types";
import { requireEditor } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/http";
import { hasMuiIcon } from "@/lib/cards/icons";
import { withContentWriteLock } from "@/lib/content-write-lock";

export async function listCards(section: CardSection) {
  return getDb().select().from(contentCards)
    .where(inArray(contentCards.kind, section === "connect" ? ["connect"] : ["project", "article"]))
    .orderBy(asc(contentCards.position), asc(contentCards.id));
}

export async function saveCard(draft: CardInput, id?: number, file?: File) {
  await requireEditor();
  if (!(await hasMuiIcon(draft.icon))) throw new AuthError("MUI 图标不存在。", 400);
  return withContentWriteLock(async () => {
    let uploaded: { image: string; rollback: () => Promise<void> } | undefined;
    try {
      return await getDb().transaction(async (db) => {
        const input = { ...draft };
        const cards = await db.select().from(contentCards).orderBy(asc(contentCards.id)).for("update");
        if (input.categoryId !== null) {
          const [category] = await db.select().from(connectCategories)
            .where(eq(connectCategories.id, input.categoryId)).limit(1).for("update");
          if (!category) throw new AuthError("分类不存在或已删除，请重新选择分类。", 400);
        }
        const existing = id === undefined ? undefined : cards.find(card => card.id === id);
        if (id !== undefined && !existing) throw new AuthError("卡片不存在或已删除。", 404);
        if (existing && (existing.kind === "connect") !== (input.kind === "connect")) {
          throw new AuthError("不能将 Connect 卡片转换为 Works 卡片。", 400);
        }
        const position = existing && existing.kind === input.kind && existing.categoryId === input.categoryId
          ? existing.position : Math.max(0, ...cards.map(card => card.position)) + 1;
        if (file) {
          const { createCardImage } = await import("@/lib/cards/assets");
          uploaded = await createCardImage(file, input.image);
          input.image = uploaded.image;
        }
        if (id !== undefined) {
          await db.update(contentCards).set({ ...input, position }).where(eq(contentCards.id, id));
          return { ...input, id, position };
        }
        const [created] = await db.insert(contentCards).values({ ...input, position }).$returningId();
        return { ...input, id: created.id, position };
      });
    } catch (error) {
      if (uploaded) {
        try { await uploaded.rollback(); } catch (rollbackError) {
          console.error("Card image rollback failed:", rollbackError);
          throw new Error("卡片保存失败且图片清理失败，请检查服务器文件。", { cause: error });
        }
      }
      throw error;
    }
  });
}

export async function deleteCard(id: number) {
  await requireEditor();
  return withContentWriteLock(async () => {
    const [result] = await getDb().delete(contentCards).where(eq(contentCards.id, id));
    if (!result.affectedRows) throw new AuthError("卡片不存在或已删除。", 404);
  });
}

export async function moveCard(id: number, direction: "up" | "down") {
  await requireEditor();
  return withContentWriteLock(() => getDb().transaction(async db => {
    const cards = await db.select().from(contentCards).orderBy(asc(contentCards.id)).for("update");
    const card = cards.find(item => item.id === id);
    if (!card) throw new AuthError("卡片不存在或已删除。", 404);
    const group = cards.filter(item => item.kind === card.kind && item.categoryId === card.categoryId)
      .sort((a, b) => a.position - b.position || a.id - b.id);
    const index = group.findIndex(item => item.id === id);
    const neighbor = index + (direction === "up" ? -1 : 1);
    if (neighbor < 0 || neighbor >= group.length) {
      throw new AuthError("卡片已位于边界，无法继续移动。", 409);
    }
    [group[index], group[neighbor]] = [group[neighbor], group[index]];
    // Normalize ties left by category deletion before saving the new order.
    for (const [position, item] of group.entries()) {
      await db.update(contentCards).set({ position: position + 1 }).where(eq(contentCards.id, item.id));
    }
    return db.select().from(contentCards)
      .where(inArray(contentCards.kind, card.kind === "connect" ? ["connect"] : ["project", "article"]))
      .orderBy(asc(contentCards.position), asc(contentCards.id));
  }));
}
