"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Ingredient } from "@/db/schema";

type ShoppingItem = {
  id: string;
  ingredientName: string;
  quantity: string | null;
  unit: string | null;
  recipeId: string | null;
};

interface Props {
  recipeId: string;
  ingredients: Ingredient[];
}

export default function RecipeListMode({ recipeId, ingredients }: Props) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/shopping");
    const data = await res.json();
    const forRecipe = (data.items as ShoppingItem[]).filter((i) => i.recipeId === recipeId);
    setShoppingItems(forRecipe);
    setLoading(false);
  }, [recipeId]);

  useEffect(() => { load(); }, [load]);

  function isNeeded(ing: Ingredient): ShoppingItem | undefined {
    return shoppingItems.find(
      (s) => s.ingredientName.toLowerCase() === ing.name.toLowerCase()
    );
  }

  async function toggle(ing: Ingredient) {
    const existing = isNeeded(ing);
    const key = ing.name;
    setToggling((prev) => new Set(prev).add(key));

    if (existing) {
      await fetch(`/api/shopping/items/${existing.id}`, { method: "DELETE" });
      setShoppingItems((prev) => prev.filter((s) => s.id !== existing.id));
    } else {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientName: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          recipeId,
        }),
      });
      const item = await res.json();
      setShoppingItems((prev) => [...prev, item]);
    }

    setToggling((prev) => { const n = new Set(prev); n.delete(key); return n; });
  }

  const needed = ingredients.filter((i) => isNeeded(i));
  const haveIt = ingredients.filter((i) => !isNeeded(i));

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Mark ingredients you still need to buy. They&apos;ll be added to your Shopping List.
        </p>

        {needed.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Need to buy · {needed.length}
            </p>
            <div className="space-y-1">
              {needed.map((ing) => (
                <IngredientRow
                  key={ing.name}
                  ing={ing}
                  needed
                  loading={toggling.has(ing.name)}
                  onToggle={() => toggle(ing)}
                />
              ))}
            </div>
          </div>
        )}

        {haveIt.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Have it · {haveIt.length}
            </p>
            <div className="space-y-1">
              {haveIt.map((ing) => (
                <IngredientRow
                  key={ing.name}
                  ing={ing}
                  needed={false}
                  loading={toggling.has(ing.name)}
                  onToggle={() => toggle(ing)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {needed.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {needed.length} item{needed.length !== 1 ? "s" : ""} added to your{" "}
          <a href="/shopping" className="underline underline-offset-2 hover:text-foreground">Shopping List</a>.
        </p>
      )}
    </div>
  );
}

function IngredientRow({
  ing, needed, loading, onToggle,
}: {
  ing: Ingredient; needed: boolean; loading: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        needed ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
      }`}
    >
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        needed ? "bg-primary border-primary" : "border-muted-foreground/30"
      }`}>
        {loading
          ? <Loader2 size={11} className="animate-spin text-primary-foreground" />
          : needed && <Check size={11} className="text-primary-foreground" />
        }
      </div>
      <span className={`text-sm flex-1 ${needed ? "font-medium" : "text-muted-foreground"}`}>
        {ing.name}
      </span>
      {(ing.quantity || ing.unit) && (
        <span className="text-xs text-muted-foreground shrink-0">
          {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
        </span>
      )}
    </button>
  );
}
