import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, recipeEdits } from "@/db/schema";
import { eq } from "drizzle-orm";

const TRACKED_FIELDS = [
  "title", "description", "cuisine", "dishType", "complexity",
  "prepTimeMinutes", "totalTimeMinutes", "originalServings", "currentServings",
  "ingredients", "steps",
] as const;

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

  const current = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Diff and log changed fields
  const edits = TRACKED_FIELDS.flatMap((field) => {
    const oldVal = (current as Record<string, unknown>)[field];
    const newVal = body[field];
    if (newVal === undefined) return [];
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    if (oldStr === newStr) return [];
    return [{ recipeId: id, field, oldValue: oldVal, newValue: newVal }];
  });

  const [row] = await db
    .update(recipes)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning();

  if (edits.length > 0) {
    await db.insert(recipeEdits).values(edits);
  }

  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(recipes).where(eq(recipes.id, id));
  return new NextResponse(null, { status: 204 });
}
