import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, shoppingLists, shoppingListItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Ingredient } from "@/db/schema";

async function getOrCreateList() {
  const [existing] = await db.select().from(shoppingLists).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(shoppingLists).values({ name: "My Shopping List" }).returning();
  return created;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: recipeId } = await params;
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const list = await getOrCreateList();
  const ingredients = recipe.ingredients as Ingredient[];

  const rows = ingredients
    .filter((i) => i.name?.trim())
    .map((i) => ({
      shoppingListId: list.id,
      recipeId,
      ingredientName: i.name.trim(),
      quantity: i.quantity ? String(parseFloat(i.quantity) || i.quantity) : null,
      unit: i.unit?.trim() || null,
    }));

  if (rows.length > 0) {
    await db.insert(shoppingListItems).values(rows);
  }

  return NextResponse.json({ added: rows.length }, { status: 201 });
}
