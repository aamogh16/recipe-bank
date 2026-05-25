import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { recipeNotes, recipes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify recipe ownership before adding a note
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), eq(recipes.userId, userId)),
    columns: { id: true },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { content } = await req.json();
  const [note] = await db.insert(recipeNotes).values({ recipeId: id, content }).returning();
  return NextResponse.json(note, { status: 201 });
}
