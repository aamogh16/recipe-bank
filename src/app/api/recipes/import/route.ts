import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { extractRecipeFromUrl, generateEmbedding, buildEmbeddingText } from "@/lib/gemini";

function ms(start: number) {
  return `${Date.now() - start}ms`;
}

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const t0 = Date.now();
  console.log("[import] start:", url);

  let extracted;
  try {
    const t = Date.now();
    extracted = await extractRecipeFromUrl(url);
    console.log(`[import] extraction done in ${ms(t)} — title: "${extracted.title}"`);
  } catch (err) {
    console.error(`[import] extraction failed after ${ms(t0)}:`, err);
    return NextResponse.json({ error: "extraction_failed", detail: String(err) }, { status: 422 });
  }

  let embedding = null;
  try {
    const t = Date.now();
    const embeddingText = buildEmbeddingText({
      title: extracted.title,
      description: extracted.description,
      cuisine: extracted.cuisine,
      dishType: extracted.dishType,
      flavorProfiles: extracted.flavorProfiles,
      ingredients: extracted.ingredients,
    });
    embedding = await generateEmbedding(embeddingText);
    console.log(`[import] embedding done in ${ms(t)} — dims: ${embedding.length}`);
  } catch (err) {
    console.error(`[import] embedding failed after ${ms(t0)} (non-fatal):`, err);
  }

  try {
    const t = Date.now();
    const [row] = await db
      .insert(recipes)
      .values({
        title: extracted.title,
        description: extracted.description,
        sourceUrl: url,
        sourceType: "url",
        photoUrl: extracted.photoUrl,
        ingredients: extracted.ingredients,
        steps: extracted.steps,
        originalServings: extracted.originalServings,
        currentServings: extracted.originalServings,
        cuisine: extracted.cuisine,
        dishType: extracted.dishType,
        complexity: extracted.complexity,
        prepTimeMinutes: extracted.prepTimeMinutes,
        totalTimeMinutes: extracted.totalTimeMinutes,
        flavorProfiles: extracted.flavorProfiles,
        embedding,
      })
      .returning();
    console.log(`[import] db insert done in ${ms(t)} — id: ${row.id}`);
    console.log(`[import] total: ${ms(t0)}`);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error(`[import] db insert failed after ${ms(t0)}:`, err);
    return NextResponse.json({ error: "db_failed", detail: String(err) }, { status: 500 });
  }
}
