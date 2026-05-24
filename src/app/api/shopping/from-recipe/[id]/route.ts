import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, shoppingLists, shoppingListItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Ingredient } from "@/db/schema";

const FRACTIONS: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75,
  "⅓": 1/3, "⅔": 2/3,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

function parseQuantity(raw: string): string | null {
  if (!raw?.trim()) return null;
  // Replace fraction chars then try to parse
  let s = raw.trim();
  for (const [char, val] of Object.entries(FRACTIONS)) {
    s = s.replace(char, String(val));
  }
  // Handle "1 1/2" style mixed numbers
  s = s.replace(/(\d+)\s+(\d+)\/(\d+)/, (_, w, n, d) => String(Number(w) + Number(n) / Number(d)));
  // Handle "1/2" style fractions
  s = s.replace(/(\d+)\/(\d+)/, (_, n, d) => String(Number(n) / Number(d)));
  const n = parseFloat(s);
  return isNaN(n) ? null : String(n);
}

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
      quantity: parseQuantity(i.quantity),
      unit: i.unit?.trim() || null,
    }));

  if (rows.length > 0) {
    await db.insert(shoppingListItems).values(rows);
  }

  return NextResponse.json({ added: rows.length }, { status: 201 });
}
