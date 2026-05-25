"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RecipeCard from "@/components/recipe-card";
import { useDebounce } from "@/lib/use-debounce";

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

export default function RecipesPage() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedQuery = useDebounce(query, 350);

  const fetchRecipes = useCallback(async (q: string) => {
    setLoading(true);
    const isVibe = q.length > 3 && !/^[a-zA-Z\s]+$/.test(q) === false && q.split(" ").length > 1;
    const endpoint = isVibe
      ? `/api/recipes/search?q=${encodeURIComponent(q)}`
      : `/api/recipes${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    setRecipes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecipes(debouncedQuery);
  }, [debouncedQuery, fetchRecipes]);

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Recipe Bank</h1>
        <Link href="/recipes/new">
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            Add Recipe
          </Button>
        </Link>
      </div>

      <div className="relative mb-8">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder='Search by name, ingredient, vibe ("romantic dinner", "cajun")...'
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse aspect-square" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          {query ? `No recipes found for "${query}"` : "No recipes yet. Add your first one!"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
