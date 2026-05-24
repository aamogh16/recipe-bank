import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/db";
import { recipes, recipeNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, Heart, ExternalLink, UtensilsCrossed } from "lucide-react";
import RecipeActions from "@/components/recipe-actions";
import type { Ingredient, Step } from "@/db/schema";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  function isValidUrl(url: string | null | undefined): url is string {
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  }

  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: { notes: { orderBy: (n, { desc }) => desc(n.createdAt) } },
  });

  if (!recipe) notFound();

  const ingredients = recipe.ingredients as Ingredient[];
  const steps = recipe.steps as Step[];
  const groups = [...new Set(ingredients.map((i) => i.group))];

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Hero image */}
      <div className="relative w-full aspect-video bg-neutral-800">
        {isValidUrl(recipe.photoUrl) ? (
          <Image src={recipe.photoUrl} alt={recipe.title} fill className="object-cover" sizes="672px" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UtensilsCrossed size={64} className="text-neutral-600" />
          </div>
        )}
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-5">
          <h1 className="text-2xl font-bold text-white leading-tight">{recipe.title}</h1>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-8">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          {recipe.isFavorite && (
            <Badge variant="secondary" className="gap-1">
              <Heart size={11} className="fill-red-400 text-red-400" /> Favorite
            </Badge>
          )}
          {recipe.cuisine && <Badge variant="outline">{recipe.cuisine}</Badge>}
          {recipe.dishType && <Badge variant="outline">{recipe.dishType}</Badge>}
          {recipe.complexity && <Badge variant="outline" className="capitalize">{recipe.complexity}</Badge>}
          {recipe.totalTimeMinutes && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock size={14} /> {recipe.totalTimeMinutes} min
            </span>
          )}
          {recipe.prepTimeMinutes && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <ChefHat size={14} /> {recipe.prepTimeMinutes} min prep
            </span>
          )}
        </div>

        {/* Source link */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={14} />
            View original source
          </a>
        )}

        {/* Description */}
        {recipe.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{recipe.description}</p>
        )}

        {/* Servings + actions */}
        <RecipeActions recipe={recipe} />

        {/* Ingredients */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Ingredients</h2>
          {groups.map((group) => (
            <div key={group} className="mb-4">
              {group && <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">{group}</h3>}
              <ul className="space-y-1">
                {ingredients
                  .filter((i) => i.group === group)
                  .map((ing, idx) => (
                    <li key={idx} className="flex items-baseline gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">
                        {ing.quantity} {ing.unit}
                      </span>
                      <span>{ing.name}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="space-y-4">
            {steps.map((step) => (
              <li key={step.order} className="flex gap-4 text-sm">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {step.order}
                </span>
                <p className="leading-relaxed pt-0.5">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Notes */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Notes</h2>
          {recipe.notes.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet. Add one after cooking!</p>
          )}
          <ul className="space-y-3 mb-4">
            {recipe.notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p>{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
