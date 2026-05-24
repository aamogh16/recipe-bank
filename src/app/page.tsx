export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import RecipeCard from "@/components/recipe-card";
import { Plus } from "lucide-react";

type RecipeSummary = {
  id: string;
  title: string;
  photoUrl: string | null;
  cuisine: string | null;
  dishType: string | null;
  complexity: string | null;
  isFavorite: boolean;
  totalTimeMinutes: number | null;
};

type Section = { title: string; href?: string; recipes: RecipeSummary[] };

async function getHomepageSections(): Promise<Section[]> {
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
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .orderBy(sql`RANDOM()`);

  if (all.length === 0) return [];

  const seen = new Set<string>();
  const sections: Section[] = [];

  function pick(pool: RecipeSummary[], max = 12): RecipeSummary[] {
    return pool.filter((r) => !seen.has(r.id)).slice(0, max);
  }

  function commit(list: RecipeSummary[]) {
    list.forEach((r) => seen.add(r.id));
  }

  // Favorites
  const favs = pick(all.filter((r) => r.isFavorite));
  if (favs.length) { commit(favs); sections.push({ title: "Favorites", recipes: favs }); }

  // Quick & Easy (≤ 30 min or complexity easy)
  const quick = pick(all.filter((r) => (r.totalTimeMinutes !== null && r.totalTimeMinutes <= 30) || r.complexity === "easy"));
  if (quick.length) { commit(quick); sections.push({ title: "Quick & Easy", recipes: quick }); }

  // Per cuisine (show any cuisine that has at least 1 recipe)
  const cuisineMap = new Map<string, RecipeSummary[]>();
  for (const r of all) {
    if (!r.cuisine || seen.has(r.id)) continue;
    if (!cuisineMap.has(r.cuisine)) cuisineMap.set(r.cuisine, []);
    cuisineMap.get(r.cuisine)!.push(r);
  }
  for (const [cuisine, pool] of cuisineMap) {
    const picked = pick(pool);
    if (picked.length) { commit(picked); sections.push({ title: cuisine, recipes: picked }); }
  }

  // Recently Added — anything not yet shown
  const recent = all.filter((r) => !seen.has(r.id));
  if (recent.length) sections.push({ title: "Recently Added", href: "/recipes", recipes: recent.slice(0, 12) });

  // If nothing was categorized at all, just show everything
  if (sections.length === 0) {
    sections.push({ title: "All Recipes", href: "/recipes", recipes: all.slice(0, 12) });
  }

  return sections;
}

export default async function Home() {
  const sections = await getHomepageSections();

  return (
    <div className="py-10 max-w-5xl mx-auto">
      <div className="px-6 mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">What are we cooking today?</p>
      </div>

      {sections.length === 0 ? (
        <div className="px-6 flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-muted-foreground">No recipes yet.</p>
          <Link href="/recipes/new" className="text-sm font-medium underline underline-offset-4">
            Add your first recipe →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <div className="flex items-center justify-between px-6 mb-4">
                <h2 className="font-semibold text-base">{section.title}</h2>
                {section.href && (
                  <Link href={section.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    See all →
                  </Link>
                )}
              </div>

              {/* Horizontal scroll row */}
              <div className="overflow-x-auto px-6">
                <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
                  {section.recipes.map((r) => (
                    <div key={r.id} className="w-44 shrink-0">
                      <RecipeCard recipe={r} />
                    </div>
                  ))}
                  {/* Add recipe nudge at the end */}
                  {section.title === "All Recipes" || section.title === "Recently Added" ? (
                    <Link
                      href="/recipes/new"
                      className="w-44 shrink-0 rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center gap-2 aspect-square text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      <Plus size={20} />
                      <span className="text-xs">Add recipe</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
