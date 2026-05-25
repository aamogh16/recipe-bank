import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { shoppingListItems } from "@/db/schema";
import { eq } from "drizzle-orm";

async function verifyOwnership(itemId: string, userId: string) {
  const item = await db.query.shoppingListItems.findFirst({
    where: eq(shoppingListItems.id, itemId),
    with: { shoppingList: { columns: { userId: true } } },
  });
  return item?.shoppingList.userId === userId ? item : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await verifyOwnership(id, userId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const [updated] = await db.update(shoppingListItems).set(body).where(eq(shoppingListItems.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await verifyOwnership(id, userId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  return new NextResponse(null, { status: 204 });
}
