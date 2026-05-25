import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { shoppingLists, shoppingListItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getOrCreateList(userId: string) {
  const [existing] = await db.select().from(shoppingLists).where(eq(shoppingLists.userId, userId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(shoppingLists).values({ name: "My Shopping List", userId }).returning();
  return created;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getOrCreateList(userId);
  const items = await db.query.shoppingListItems.findMany({
    where: eq(shoppingListItems.shoppingListId, list.id),
    with: { recipe: { columns: { id: true, title: true } } },
    orderBy: (i, { asc }) => asc(i.createdAt),
  });
  return NextResponse.json({ listId: list.id, items });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getOrCreateList(userId);
  const { ingredientName, quantity, unit, recipeId } = await req.json();
  if (!ingredientName?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const [item] = await db.insert(shoppingListItems).values({
    shoppingListId: list.id,
    ingredientName: ingredientName.trim(),
    quantity: quantity ?? null,
    unit: unit?.trim() || null,
    recipeId: recipeId ?? null,
  }).returning();
  return NextResponse.json(item, { status: 201 });
}

// ?all=true clears everything, otherwise clears only checked
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getOrCreateList(userId);
  const all = new URL(req.url).searchParams.get("all") === "true";
  if (all) {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, list.id));
  } else {
    await db.delete(shoppingListItems).where(
      and(eq(shoppingListItems.shoppingListId, list.id), eq(shoppingListItems.isChecked, true))
    );
  }
  return new NextResponse(null, { status: 204 });
}
