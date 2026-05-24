import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, recipeNotes, cookLog } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: { notes: { orderBy: (n, { desc }) => desc(n.createdAt) }, cookLog: true },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db.update(recipes).set({ ...body, updatedAt: new Date() }).where(eq(recipes.id, id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(recipes).where(eq(recipes.id, id));
  return new NextResponse(null, { status: 204 });
}
