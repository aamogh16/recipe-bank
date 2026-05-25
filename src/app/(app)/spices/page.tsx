export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { recipes, customSpices } from "@/db/schema";
import { desc, asc, eq } from "drizzle-orm";
import type { Ingredient } from "@/db/schema";
import SpiceSortToggle from "./sort-toggle";
import AddSpice from "./add-spice";
import { makeIsSpice, cleanSpiceName } from "@/lib/spices";

type Sort = "popular" | "newest";

async function getSpices(sort: Sort, userId: string) {
  const [rows, customRows] = await Promise.all([
    db.select({ ingredients: recipes.ingredients, createdAt: recipes.createdAt })
      .from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(sort === "newest" ? desc(recipes.createdAt) : asc(recipes.createdAt)),
    db.select({ name: customSpices.name })
      .from(customSpices)
      .where(eq(customSpices.userId, userId)),
  ]);

  const isSpice = makeIsSpice(customRows.map((r) => r.name));

  if (sort === "popular") {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      for (const ing of row.ingredients as Ingredient[]) {
        const name = cleanSpiceName(ing.name.trim());
        if (name && isSpice(name)) counts[name] = (counts[name] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  const seen = new Set<string>();
  const result: { name: string; count: number }[] = [];
  for (const row of rows) {
    for (const ing of row.ingredients as Ingredient[]) {
      const name = cleanSpiceName(ing.name.trim());
      const key = name.toLowerCase();
      if (key && !seen.has(key) && isSpice(name)) {
        seen.add(key);
        result.push({ name, count: 1 });
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
  const { userId } = await auth();
  const { sort: rawSort } = await searchParams;
  const sort: Sort = rawSort === "newest" ? "newest" : "popular";
  const spices = await getSpices(sort, userId!);

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Spice Hub</h1>
        <SpiceSortToggle current={sort} />
      </div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-muted-foreground text-sm">
          {spices.length} unique spice{spices.length !== 1 ? "s" : ""} across all recipes.
        </p>
        <AddSpice />
      </div>

      {spices.length === 0 ? (
        <p className="text-muted-foreground">No spices found. Add recipes or expand the master list.</p>
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
