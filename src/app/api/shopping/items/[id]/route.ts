import { NextResponse } from "next/server";
import { db } from "@/db";
import { shoppingListItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [item] = await db.update(shoppingListItems).set(body).where(eq(shoppingListItems.id, id)).returning();
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  return new NextResponse(null, { status: 204 });
}
