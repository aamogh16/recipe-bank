import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { cookLog, recipes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify the recipe belongs to this user
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), eq(recipes.userId, userId)),
    columns: { id: true },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [entry] = await db.insert(cookLog).values({ recipeId: id, userId }).returning();
  return NextResponse.json(entry, { status: 201 });
}
