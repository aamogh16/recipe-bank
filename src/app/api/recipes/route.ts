import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { desc, ilike, or, eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const userFilter = eq(recipes.userId, userId);

  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      photoUrl: recipes.photoUrl,
      cuisine: recipes.cuisine,
      dishType: recipes.dishType,
      complexity: recipes.complexity,
      isFavorite: recipes.isFavorite,
      totalTimeMinutes: recipes.totalTimeMinutes,
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .where(
      q
        ? and(userFilter, or(ilike(recipes.title, `%${q}%`), ilike(recipes.cuisine, `%${q}%`), ilike(recipes.dishType, `%${q}%`)))
        : userFilter
    )
    .orderBy(desc(recipes.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [row] = await db.insert(recipes).values({ ...body, userId }).returning();
  return NextResponse.json(row, { status: 201 });
}
