"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ChefHat, Loader2, Minus, Plus, Trash2, ShoppingCart, Check } from "lucide-react";
import type { Recipe } from "@/db/schema";

export default function RecipeActions({ recipe }: { recipe: Recipe & { notes: { id: string; content: string; createdAt: Date }[] } }) {
  const router = useRouter();
  const [servings, setServings] = useState(recipe.currentServings ?? recipe.originalServings ?? 4);
  const [isFavorite, setIsFavorite] = useState(recipe.isFavorite);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [logging, setLogging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addedToList, setAddedToList] = useState(false);

  async function toggleFavorite() {
    const next = !isFavorite;
    setIsFavorite(next);
    await fetch(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
    router.refresh();
  }

  async function addToShoppingList() {
    await fetch(`/api/shopping/from-recipe/${recipe.id}`, { method: "POST" });
    setAddedToList(true);
    setTimeout(() => setAddedToList(false), 2500);
  }

  async function deleteRecipe() {
    if (!confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    router.push("/recipes");
  }

  async function logCook() {
    setLogging(true);
    await fetch(`/api/recipes/${recipe.id}/cook`, { method: "POST" });
    setLogging(false);
    router.refresh();
  }

  async function addNote() {
    if (!note.trim()) return;
    setSavingNote(true);
    await fetch(`/api/recipes/${recipe.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
    setNote("");
    setSavingNote(false);
    router.refresh();
  }

  const ratio = recipe.originalServings ? servings / recipe.originalServings : 1;
  const scaled = (qty: string) => {
    const n = parseFloat(qty);
    if (isNaN(n)) return qty;
    const result = n * ratio;
    return Number.isInteger(result) ? result.toString() : result.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Servings scaler */}
      {recipe.originalServings && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Servings</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-sm font-medium">{servings}</span>
            <button
              onClick={() => setServings((s) => s + 1)}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
          {servings !== recipe.originalServings && (
            <span className="text-xs text-muted-foreground">(original: {recipe.originalServings})</span>
          )}
        </div>
      )}

      {/* Favorite + log cook */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={isFavorite ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={toggleFavorite}
        >
          <Heart size={14} className={isFavorite ? "fill-current" : ""} />
          {isFavorite ? "Favorited" : "Add to Favorites"}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={logCook} disabled={logging}>
          {logging ? <Loader2 size={14} className="animate-spin" /> : <ChefHat size={14} />}
          Log Cook
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={addToShoppingList} disabled={addedToList}>
          {addedToList ? <Check size={14} /> : <ShoppingCart size={14} />}
          {addedToList ? "Added!" : "Add to List"}
        </Button>
        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={deleteRecipe} disabled={deleting}>
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete
        </Button>
      </div>

      {/* Add note */}
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Add a note after cooking…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="sm" onClick={addNote} disabled={savingNote || !note.trim()} className="gap-2">
          {savingNote && <Loader2 size={14} className="animate-spin" />}
          Save Note
        </Button>
      </div>
    </div>
  );
}
