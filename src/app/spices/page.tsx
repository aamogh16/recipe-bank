import { db } from "@/db";
import { recipes } from "@/db/schema";
import type { Ingredient } from "@/db/schema";

async function getSpices() {
  const rows = await db.select({ ingredients: recipes.ingredients }).from(recipes);
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const ingredients = row.ingredients as Ingredient[];
    for (const ing of ingredients) {
      const name = ing.name.toLowerCase().trim();
      if (name) counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default async function SpicesPage() {
  const spices = await getSpices();

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Spice Hub</h1>
      <p className="text-muted-foreground text-sm mb-8">All ingredients across your recipes, sorted by frequency.</p>

      {spices.length === 0 ? (
        <p className="text-muted-foreground">Add some recipes first.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {spices.map(([name]) => (
            <div key={name} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm">
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
