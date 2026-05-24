import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { desc, ilike, or, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

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
        ? or(
            ilike(recipes.title, `%${q}%`),
            ilike(recipes.cuisine, `%${q}%`),
            ilike(recipes.dishType, `%${q}%`)
          )
        : undefined
    )
    .orderBy(desc(recipes.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await db.insert(recipes).values(body).returning();
  return NextResponse.json(row, { status: 201 });
}
