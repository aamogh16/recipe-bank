import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { extractRecipeFromUrl, generateEmbedding, buildEmbeddingText } from "@/lib/gemini";

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  console.log("[import] fetching:", url);

  let extracted;
  try {
    extracted = await extractRecipeFromUrl(url);
    console.log("[import] extracted:", extracted.title);
  } catch (err) {
    console.error("[import] extraction failed:", err);
    return NextResponse.json({ error: "extraction_failed", detail: String(err) }, { status: 422 });
  }

  let embedding;
  try {
    const embeddingText = buildEmbeddingText({
      title: extracted.title,
      description: extracted.description,
      cuisine: extracted.cuisine,
      dishType: extracted.dishType,
      flavorProfiles: extracted.flavorProfiles,
      ingredients: extracted.ingredients,
    });
    embedding = await generateEmbedding(embeddingText);
    console.log("[import] embedding generated, dims:", embedding.length);
  } catch (err) {
    console.error("[import] embedding failed:", err);
    // non-fatal — save without embedding, search won't work for this recipe
    embedding = null;
  }

  try {
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
    console.log("[import] saved recipe id:", row.id);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("[import] db insert failed:", err);
    return NextResponse.json({ error: "db_failed", detail: String(err) }, { status: 500 });
  }
}
