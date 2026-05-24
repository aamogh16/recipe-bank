import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/db";
import { recipes, recipeEdits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, Heart, ExternalLink, UtensilsCrossed } from "lucide-react";
import RecipeActions from "@/components/recipe-actions";
import RecipeEditForm from "@/components/recipe-edit-form";
import RecipeEditsSection from "@/components/recipe-edits-section";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  function isValidUrl(url: string | null | undefined): url is string {
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  }

  const [recipe, edits] = await Promise.all([
    db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: { notes: { orderBy: (n, { desc }) => desc(n.createdAt) } },
    }),
    db.select().from(recipeEdits).where(eq(recipeEdits.recipeId, id)).orderBy(desc(recipeEdits.createdAt)),
  ]);

  if (!recipe) notFound();

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

        {/* Actions: favorite, log cook, delete, notes */}
        <RecipeActions recipe={recipe} />

        {/* Description + ingredients + steps (view/edit toggled) */}
        <RecipeEditForm recipe={recipe} />

        {/* Recipe Edits */}
        {edits.length > 0 && <RecipeEditsSection edits={edits} />}

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
