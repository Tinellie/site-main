import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { contentCards } from "@/db/schema";
import type { CardInput, CardSection } from "@/features/cards/types";
import { requireEditor } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/http";
import { hasMuiIcon } from "@/lib/cards/icons";

export async function listCards(section: CardSection) {
  return getDb().select().from(contentCards)
    .where(inArray(contentCards.kind, section === "connect" ? ["connect"] : ["project", "article"]))
    .orderBy(asc(contentCards.id));
}

export async function saveCard(input: CardInput, id?: number) {
  await requireEditor();
  if (!(await hasMuiIcon(input.icon))) throw new AuthError("MUI 图标不存在。", 400);
  const db = getDb();
  if (id !== undefined) {
    const [existing] = await db.select().from(contentCards).where(eq(contentCards.id, id)).limit(1);
    if (!existing) throw new AuthError("卡片不存在或已删除。", 404);
    if ((existing.kind === "connect") !== (input.kind === "connect")) {
      throw new AuthError("不能将 Connect 卡片转换为 Works 卡片。", 400);
    }
    await db.update(contentCards).set(input).where(eq(contentCards.id, id));
    return { ...input, id };
  }
  const [created] = await db.insert(contentCards).values(input).$returningId();
  return { ...input, id: created.id };
}

export async function deleteCard(id: number) {
  await requireEditor();
  const [result] = await getDb().delete(contentCards).where(eq(contentCards.id, id));
  if (!result.affectedRows) throw new AuthError("卡片不存在或已删除。", 404);
}
