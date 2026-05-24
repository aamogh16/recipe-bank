import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { generateEmbedding } from "@/lib/gemini";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const embedding = await generateEmbedding(q);
  const vector = `[${embedding.join(",")}]`;

  const rows = await db.execute(sql`
    SELECT id, title, photo_url, cuisine, dish_type, complexity, is_favorite, total_time_minutes,
           1 - (embedding <=> ${vector}::vector) AS similarity
    FROM recipes
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vector}::vector
    LIMIT 20
  `);

  return NextResponse.json(rows.rows);
}
