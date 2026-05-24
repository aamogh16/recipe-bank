import { db } from "@/db";
import { recipes } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import type { Ingredient } from "@/db/schema";
import SpiceSortToggle from "./sort-toggle";

type Sort = "popular" | "newest";

async function getSpices(sort: Sort) {
  const rows = await db
    .select({ ingredients: recipes.ingredients, createdAt: recipes.createdAt })
    .from(recipes)
    .orderBy(sort === "newest" ? desc(recipes.createdAt) : asc(recipes.createdAt));

  if (sort === "popular") {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      for (const ing of row.ingredients as Ingredient[]) {
        const name = ing.name.trim();
        if (name) counts[name] = (counts[name] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  // Newest: deduplicate, keep first occurrence from newest recipe
  const seen = new Set<string>();
  const result: { name: string; count: number }[] = [];
  for (const row of rows) {
    for (const ing of row.ingredients as Ingredient[]) {
      const key = ing.name.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ name: ing.name.trim(), count: 1 });
      }
    }
  }
  return result;
}

export default async function SpicesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort: Sort = rawSort === "newest" ? "newest" : "popular";
  const spices = await getSpices(sort);

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Spice Hub</h1>
        <SpiceSortToggle current={sort} />
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        {spices.length} unique ingredient{spices.length !== 1 ? "s" : ""} across all recipes.
      </p>

      {spices.length === 0 ? (
        <p className="text-muted-foreground">Add some recipes first.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {spices.map(({ name, count }) => (
            <div
              key={name}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
            >
              <span>{name}</span>
              {sort === "popular" && count > 1 && (
                <span className="text-xs text-muted-foreground">×{count}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
