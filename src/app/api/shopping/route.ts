import { NextResponse } from "next/server";
import { db } from "@/db";
import { shoppingLists, shoppingListItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getOrCreateList() {
  const [existing] = await db.select().from(shoppingLists).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(shoppingLists).values({ name: "My Shopping List" }).returning();
  return created;
}

export async function GET() {
  const list = await getOrCreateList();
  const items = await db.query.shoppingListItems.findMany({
    where: eq(shoppingListItems.shoppingListId, list.id),
    with: { recipe: { columns: { id: true, title: true } } },
    orderBy: (i, { asc }) => asc(i.createdAt),
  });
  return NextResponse.json({ listId: list.id, items });
}

export async function POST(req: Request) {
  const list = await getOrCreateList();
  const { ingredientName, quantity, unit } = await req.json();
  if (!ingredientName?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const [item] = await db.insert(shoppingListItems).values({
    shoppingListId: list.id,
    ingredientName: ingredientName.trim(),
    quantity: quantity ?? null,
    unit: unit?.trim() || null,
  }).returning();
  return NextResponse.json(item, { status: 201 });
}

// Clear all checked items
export async function DELETE() {
  const list = await getOrCreateList();
  await db.delete(shoppingListItems).where(
    and(eq(shoppingListItems.shoppingListId, list.id), eq(shoppingListItems.isChecked, true))
  );
  return new NextResponse(null, { status: 204 });
}
