import Link from "next/link";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import RecipeCard from "@/components/recipe-card";

async function getHomepageRecipes() {
  const all = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      photoUrl: recipes.photoUrl,
      cuisine: recipes.cuisine,
      dishType: recipes.dishType,
      complexity: recipes.complexity,
      isFavorite: recipes.isFavorite,
      totalTimeMinutes: recipes.totalTimeMinutes,
    })
    .from(recipes)
    .orderBy(sql`RANDOM()`)
    .limit(12);
  return all;
}

export default async function Home() {
  const suggestions = await getHomepageRecipes();

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
      <p className="text-muted-foreground mt-1 mb-8">What are we cooking today?</p>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-muted-foreground text-lg">No recipes yet.</p>
          <Link
            href="/recipes/new"
            className="text-sm font-medium underline underline-offset-4"
          >
            Add your first recipe →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
            {suggestions.map((r) => (
              <div key={r.id} className="w-52 shrink-0">
                <RecipeCard recipe={r} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
