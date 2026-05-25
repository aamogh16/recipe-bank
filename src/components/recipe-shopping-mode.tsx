"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { Ingredient } from "@/db/schema";

type ShoppingItem = {
  id: string;
  ingredientName: string;
  quantity: string | null;
  unit: string | null;
  recipeId: string | null;
  storeQuantity: string | null;
  storeUnit: string | null;
  storePrice: string | null;
};

interface Props {
  recipeId: string;
  ingredients: Ingredient[];
  onGoToList: () => void;
}

function parseQty(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function normalizeUnit(u: string | null | undefined): string {
  return (u ?? "").toLowerCase().trim();
}

function calcCost(ing: Ingredient, item: ShoppingItem): number | null {
  const storePrice = parseQty(item.storePrice);
  if (!storePrice) return null;

  const storeQty = parseQty(item.storeQuantity);
  const recipeQty = parseQty(ing.quantity);

  const sameUnit = normalizeUnit(item.storeUnit) === normalizeUnit(ing.unit);
  if (sameUnit && storeQty && recipeQty && storeQty > 0) {
    return (recipeQty / storeQty) * storePrice;
  }
  // Units don't match or no quantities — treat store price as total for this ingredient
  return storePrice;
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function RecipeShoppingMode({ recipeId, ingredients, onGoToList }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/shopping");
    const data = await res.json();
    const forRecipe = (data.items as ShoppingItem[]).filter((i) => i.recipeId === recipeId);
    setItems(forRecipe);
    setLoading(false);
  }, [recipeId]);

  useEffect(() => { load(); }, [load]);

  async function updateItem(id: string, patch: Partial<Pick<ShoppingItem, "storeQuantity" | "storeUnit" | "storePrice">>) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
    setSaving((prev) => ({ ...prev, [id]: true }));
    await fetch(`/api/shopping/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving((prev) => ({ ...prev, [id]: false }));
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-muted-foreground text-sm">No ingredients marked as needed yet.</p>
        <button onClick={onGoToList} className="text-sm text-primary underline underline-offset-2">
          Switch to List mode →
        </button>
      </div>
    );
  }

  const ingMap = new Map(ingredients.map((i) => [i.name.toLowerCase(), i]));

  const costs = items.map((item) => {
    const ing = ingMap.get(item.ingredientName.toLowerCase());
    return ing ? calcCost(ing, item) : null;
  });

  const total = costs.every((c) => c !== null)
    ? costs.reduce((sum, c) => sum! + c!, 0)
    : null;

  const partialTotal = costs.some((c) => c !== null)
    ? costs.filter((c) => c !== null).reduce((sum, c) => sum! + c!, 0)
    : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the store package size and price. RecipeBank calculates your actual cost for the recipe amount.
      </p>

      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Ingredient</span>
          <span className="text-right w-24">Store pkg</span>
          <span className="text-right w-20">Price</span>
          <span className="text-right w-16">Cost</span>
        </div>

        {items.map((item, i) => {
          const ing = ingMap.get(item.ingredientName.toLowerCase());
          const cost = ing ? calcCost(ing, item) : null;
          const unitsMatch = ing && normalizeUnit(item.storeUnit) === normalizeUnit(ing.unit);
          const isSaving = saving[item.id];

          return (
            <div key={item.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-3 ${i < items.length - 1 ? "border-b border-border" : ""}`}>
              {/* Ingredient */}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.ingredientName}</p>
                {ing && (ing.quantity || ing.unit) && (
                  <p className="text-xs text-muted-foreground">
                    Recipe: {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
                  </p>
                )}
              </div>

              {/* Store package size */}
              <div className="w-24 flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="qty"
                  value={item.storeQuantity ?? ""}
                  onChange={(e) => updateItem(item.id, { storeQuantity: e.target.value || null })}
                  className="w-12 bg-transparent border-b border-border text-xs text-right outline-none py-0.5 placeholder:text-muted-foreground/40"
                />
                <input
                  type="text"
                  placeholder={ing?.unit || "unit"}
                  value={item.storeUnit ?? ""}
                  onChange={(e) => updateItem(item.id, { storeUnit: e.target.value || null })}
                  className="w-10 bg-transparent border-b border-border text-xs outline-none py-0.5 placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Store price */}
              <div className="w-20 relative">
                <span className="absolute left-0 top-0.5 text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.storePrice ?? ""}
                  onChange={(e) => updateItem(item.id, { storePrice: e.target.value || null })}
                  className="w-full pl-3 bg-transparent border-b border-border text-xs text-right outline-none py-0.5 placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Calculated cost */}
              <div className="w-16 text-right">
                {isSaving ? (
                  <Loader2 size={11} className="animate-spin text-muted-foreground ml-auto" />
                ) : cost !== null ? (
                  <div>
                    <span className="text-sm font-semibold">{fmt(cost)}</span>
                    {!unitsMatch && item.storePrice && (
                      <p className="text-[10px] text-muted-foreground leading-none mt-0.5">full price</p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground/40 text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <span className="text-sm font-semibold">Estimated recipe cost</span>
          <div className="text-right">
            {total !== null ? (
              <span className="text-base font-bold">{fmt(total)}</span>
            ) : partialTotal !== null ? (
              <div>
                <span className="text-base font-bold">{fmt(partialTotal)}+</span>
                <p className="text-[10px] text-muted-foreground">some prices missing</p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Enter prices above</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
