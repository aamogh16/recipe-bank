import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generateEmbedding } from "@/lib/gemini";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const embedding = await generateEmbedding(q);
  const vec = `[${embedding.join(",")}]`;

  const rows = await db.execute(sql`
    SELECT id, title, photo_url, cuisine, dish_type, complexity, is_favorite, total_time_minutes,
           1 - (embedding <=> ${vec}::vector(3072)) AS similarity
    FROM recipes
    WHERE user_id = ${userId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector(3072)
    LIMIT 20
  `);

  return NextResponse.json(rows.rows);
}
