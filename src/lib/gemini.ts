import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Ingredient, Step } from "@/db/schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export type ExtractedRecipe = {
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: Step[];
  originalServings: number | null;
  cuisine: string | null;
  dishType: string | null;
  complexity: "easy" | "medium" | "hard" | null;
  prepTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  flavorProfiles: string[];
  photoUrl: string | null;
};

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // fractions
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/&frac13;/g, "⅓")
    .replace(/&frac23;/g, "⅔")
    .replace(/&frac18;/g, "⅛")
    .replace(/&frac38;/g, "⅜")
    .replace(/&frac58;/g, "⅝")
    .replace(/&frac78;/g, "⅞")
    // numeric decimal and hex
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  return (parseInt(match[1] ?? "0") * 60) + parseInt(match[2] ?? "0");
}

function tryExtractJsonLd(html: string): ExtractedRecipe | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const nodes: unknown[] = Array.isArray(data)
        ? data
        : data["@graph"]
        ? data["@graph"]
        : [data];

      const recipe = nodes.find(
        (n): n is Record<string, unknown> =>
          typeof n === "object" && n !== null && (n as Record<string, unknown>)["@type"] === "Recipe"
      );
      if (!recipe) continue;

      const rawIngredients = (recipe.recipeIngredient as string[] | undefined) ?? [];
      // Store the full raw string — Gemini cleanup will properly split quantity/unit/name
      const ingredients: Ingredient[] = rawIngredients.map((line) => ({
        group: "",
        name: decodeEntities(line.trim()),
        quantity: "",
        unit: "",
      }));

      const rawSteps = (recipe.recipeInstructions as unknown[] | undefined) ?? [];
      // Flatten HowToSection (grouped steps) into a flat list of HowToStep
      const flatSteps: string[] = [];
      for (const s of rawSteps) {
        if (typeof s === "string") {
          flatSteps.push(s);
        } else {
          const node = s as Record<string, unknown>;
          if (node["@type"] === "HowToSection" && Array.isArray(node.itemListElement)) {
            for (const sub of node.itemListElement as Record<string, string>[]) {
              if (sub.text) flatSteps.push(sub.text);
            }
          } else {
            const text = (node.text as string) ?? "";
            if (text) flatSteps.push(text);
          }
        }
      }
      const steps: Step[] = flatSteps
        .map((t) => decodeEntities(t))
        .filter(Boolean)
        .map((text, i) => ({ order: i + 1, text }));

      const imageVal = recipe.image;
      const photoUrl =
        typeof imageVal === "string"
          ? imageVal
          : Array.isArray(imageVal)
          ? (imageVal[0] as string)
          : typeof imageVal === "object" && imageVal !== null
          ? ((imageVal as Record<string, string>).url ?? null)
          : null;

      const yieldVal = recipe.recipeYield;
      const servingsRaw = Array.isArray(yieldVal) ? yieldVal[0] : yieldVal;
      const servings = servingsRaw ? parseInt(String(servingsRaw)) : null;

      const cookTime = parseDuration(recipe.cookTime as string);
      const prepTime = parseDuration(recipe.prepTime as string);
      const totalTime = parseDuration(recipe.totalTime as string) ?? (cookTime && prepTime ? cookTime + prepTime : null);

      return {
        title: decodeEntities(String(recipe.name ?? "Untitled")),
        description: decodeEntities(String(recipe.description ?? "")),
        ingredients,
        steps,
        originalServings: isNaN(servings!) ? null : servings,
        cuisine: Array.isArray(recipe.recipeCuisine)
          ? (recipe.recipeCuisine as string[])[0]
          : (recipe.recipeCuisine as string | null) ?? null,
        dishType: Array.isArray(recipe.recipeCategory)
          ? (recipe.recipeCategory as string[])[0]
          : (recipe.recipeCategory as string | null) ?? null,
        complexity: null,
        prepTimeMinutes: prepTime,
        totalTimeMinutes: totalTime,
        flavorProfiles: [],
        photoUrl,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function stripHtml(html: string): string {
  // Remove tags that are pure noise
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 8000); // ~2000 tokens — much cheaper
}

function resolveUrl(maybeRelative: string | null, base: string): string | null {
  if (!maybeRelative) return null;
  try { return new URL(maybeRelative, base).href; } catch { return null; }
}

export async function extractRecipeFromTikTok(url: string): Promise<ExtractedRecipe> {
  // oEmbed is public — no auth needed, works with short links too
  const oembedRes = await fetch(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
  );
  if (!oembedRes.ok) throw new Error(`TikTok oEmbed failed (${oembedRes.status})`);

  const oembed = await oembedRes.json();
  const caption: string = oembed.title ?? "";
  const thumbnailUrl: string | null = oembed.thumbnail_url ?? null;

  if (!caption.trim()) throw new Error("No caption");

  const prompt = `Extract a recipe from this TikTok video caption. Return ONLY valid JSON, no markdown.

{
  "title": "string",
  "description": "1-2 sentences or empty string",
  "ingredients": [{"group": "", "name": "string", "quantity": "string", "unit": "string"}],
  "steps": [{"order": 1, "text": "string"}],
  "originalServings": number or null,
  "cuisine": "string or null",
  "dishType": "string or null",
  "complexity": "easy"|"medium"|"hard"|null,
  "prepTimeMinutes": number or null,
  "totalTimeMinutes": number or null,
  "flavorProfiles": ["string"],
  "photoUrl": null
}

If the caption does not contain ingredient or step information, return empty arrays for those fields.

CAPTION:
${caption}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
  const extracted = JSON.parse(text) as ExtractedRecipe;
  extracted.photoUrl = thumbnailUrl;
  return extracted;
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();

  // Try JSON-LD first — fast and cheap, works on most major recipe sites
  const jsonLdResult = tryExtractJsonLd(html);
  if (jsonLdResult) {
    jsonLdResult.photoUrl = resolveUrl(jsonLdResult.photoUrl, url);
    console.log("[gemini] JSON-LD found, sending to Gemini for cleanup");
    try {
      return await cleanWithGemini(jsonLdResult);
    } catch (err) {
      console.warn("[gemini] cleanup failed, using raw JSON-LD:", err);
      return jsonLdResult;
    }
  }

  // Fallback: send stripped text to Gemini
  console.log("[gemini] no JSON-LD found, falling back to Gemini extraction");
  const cleanText = stripHtml(html);

  const prompt = `Extract the recipe from this text and return ONLY valid JSON. No markdown.

{
  "title": "string",
  "description": "1-2 sentences",
  "ingredients": [{"group": "", "name": "string", "quantity": "string", "unit": "string"}],
  "steps": [{"order": 1, "text": "string"}],
  "originalServings": number or null,
  "cuisine": "string or null",
  "dishType": "string or null",
  "complexity": "easy"|"medium"|"hard"|null,
  "prepTimeMinutes": number or null,
  "totalTimeMinutes": number or null,
  "flavorProfiles": ["string"],
  "photoUrl": null
}

TEXT:
${cleanText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(text) as ExtractedRecipe;
}

async function cleanWithGemini(recipe: ExtractedRecipe): Promise<ExtractedRecipe> {
  const prompt = `You are cleaning up recipe data that was auto-extracted from a website. Fix any issues and fill in missing fields.

Rules:
- Split each ingredient correctly into quantity (number as string), unit (tsp/cup/oz/etc or ""), and name (the ingredient itself, no quantities)
- Group related ingredients (e.g. "Sauce", "Marinade", "Main") where it makes sense — use "" if no grouping needed
- Clean up step text (remove numbering if present, fix whitespace)
- Fill in: complexity ("easy"/"medium"/"hard"), flavorProfiles (up to 5 descriptors like "creamy", "spicy", "smoky"), cuisine, dishType
- Keep photoUrl, title, description, originalServings, prepTimeMinutes, totalTimeMinutes as-is unless clearly wrong
- Return ONLY valid JSON, no markdown

Input:
${JSON.stringify(recipe, null, 2)}

Return the same JSON structure with fixes applied.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
  const cleaned = JSON.parse(text) as ExtractedRecipe;
  // Always keep our resolved photoUrl, don't let Gemini overwrite it
  cleaned.photoUrl = recipe.photoUrl;
  return cleaned;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

export function buildEmbeddingText(recipe: {
  title: string;
  description: string | null;
  cuisine: string | null;
  dishType: string | null;
  flavorProfiles: string[] | null;
  ingredients: Ingredient[];
}): string {
  const parts = [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    recipe.dishType,
    (recipe.flavorProfiles ?? []).join(", "),
    recipe.ingredients.map((i) => i.name).join(", "),
  ].filter(Boolean);
  return parts.join(". ");
}
