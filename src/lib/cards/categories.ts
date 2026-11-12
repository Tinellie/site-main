import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { connectCategories } from "@/db/schema";
import type { CategoryMutation } from "@/features/cards/types";
import { AuthError } from "@/lib/auth/http";
import { requireEditor } from "@/lib/auth/session";

export async function listCategories() {
  return getDb().select().from(connectCategories)
    .orderBy(asc(connectCategories.position), asc(connectCategories.id));
}

function categoryFailure(error: unknown): never {
  if (error instanceof Error && "cause" in error && error.cause &&
    typeof error.cause === "object" && "code" in error.cause && error.cause.code === "ER_DUP_ENTRY") {
    throw new AuthError("已存在同名分类。", 409);
  }
  throw error;
}

export async function createCategory(name: string) {
  await requireEditor();
  try {
    return await getDb().transaction(async tx => {
      const categories = await tx.select().from(connectCategories).orderBy(asc(connectCategories.id)).for("update");
      const position = Math.max(0, ...categories.map(category => category.position)) + 1;
      const [created] = await tx.insert(connectCategories).values({ name, position }).$returningId();
      return { id: created.id, name, position };
    });
  } catch (error) { categoryFailure(error); }
}

export async function mutateCategory(id: number, mutation?: CategoryMutation) {
  await requireEditor();
  try {
    return await getDb().transaction(async tx => {
      const categories = await tx.select().from(connectCategories).orderBy(asc(connectCategories.id)).for("update");
      const category = categories.find(item => item.id === id);
      if (!category) throw new AuthError("分类不存在或已删除。", 404);
      if (!mutation) {
        await tx.delete(connectCategories).where(eq(connectCategories.id, id));
      } else if ("name" in mutation) {
        await tx.update(connectCategories).set({ name: mutation.name }).where(eq(connectCategories.id, id));
      } else {
        const ordered = categories.sort((a, b) => a.position - b.position || a.id - b.id);
        const index = ordered.findIndex(item => item.id === id);
        const neighbor = ordered[index + (mutation.direction === "up" ? -1 : 1)];
        if (!neighbor) throw new AuthError("分类已位于边界，无法继续移动。", 409);
        await tx.update(connectCategories).set({ position: neighbor.position }).where(eq(connectCategories.id, id));
        await tx.update(connectCategories).set({ position: category.position }).where(eq(connectCategories.id, neighbor.id));
      }
      return tx.select().from(connectCategories).orderBy(asc(connectCategories.position), asc(connectCategories.id));
    });
  } catch (error) { categoryFailure(error); }
}
