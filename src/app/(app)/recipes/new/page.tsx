"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link2, PenLine, Loader2, CalendarCheck2, Search } from "lucide-react";
import { useDebounce } from "@/lib/use-debounce";

type Tab = "search" | "url" | "manual";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  domain: string;
};

function NewRecipeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignDate = searchParams.get("date");
  const assignMeal = searchParams.get("meal");

  const [tab, setTab] = useState<Tab>("search");

  // Search tab state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 500);

  // URL tab state
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // Manual tab state
  const [title, setTitle] = useState("");
  const [ingredientsRaw, setIngredientsRaw] = useState("");
  const [stepsRaw, setStepsRaw] = useState("");
  const [servings, setServings] = useState("");
  const [saving, setSaving] = useState(false);

  // Shared error
  const [error, setError] = useState(""); // used for both URL import and manual save errors

  // Fire search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setSearching(true);
    setSearchError("");
    fetch(`/api/search/recipes?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
        else setSearchError("Search failed. Try a different query.");
      })
      .catch(() => setSearchError("Search unavailable."))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  async function afterCreate(recipeId: string) {
    router.refresh();
    if (assignDate && assignMeal) {
      await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: assignDate, mealType: assignMeal, recipeId }),
      });
      router.push("/plan");
    } else {
      router.push(`/recipes/${recipeId}`);
    }
  }

  async function importFromUrl(targetUrl: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`Import failed: ${data.detail ?? data.error ?? res.status}`);
        setLoading(false);
        return;
      }
      await afterCreate(data.id);
    } catch (err) {
      setError(`Unexpected error: ${String(err)}`);
      setLoading(false);
    }
  }

  async function handleResultClick(result: SearchResult) {
    setImportingUrl(result.url);
    await importFromUrl(result.url, () => {});
    setImportingUrl(null);
  }

  async function handleUrlImport() {
    await importFromUrl(url.trim(), setImporting);
  }

  async function handleManualSave() {
    if (!title.trim()) return;
    setSaving(true);
    const ingredients = ingredientsRaw.split("\n").filter(Boolean)
      .map((line) => ({ group: "", name: line.trim(), quantity: "", unit: "" }));
    const steps = stepsRaw.split("\n").filter(Boolean)
      .map((line, i) => ({ order: i + 1, text: line.trim() }));
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, ingredients, steps,
          originalServings: servings ? parseInt(servings) : null,
          currentServings: servings ? parseInt(servings) : null,
          sourceType: "manual",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(`Save failed: ${data.error ?? res.status}`);
        setSaving(false);
        return;
      }
      const recipe = await res.json();
      await afterCreate(recipe.id);
    } catch (err) {
      setError(`Unexpected error: ${String(err)}`);
      setSaving(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "search", label: "Search", icon: Search },
    { key: "url", label: "Import from URL", icon: Link2 },
    { key: "manual", label: "Enter Manually", icon: PenLine },
  ];

  return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Add Recipe</h1>

      {assignDate && assignMeal && (
        <div className="flex items-center gap-2 mb-6 mt-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
          <CalendarCheck2 size={14} />
          Will be added to{" "}
          <span className="font-medium capitalize">{assignMeal}</span> on{" "}
          <span className="font-medium">
            {new Date(`${assignDate}T12:00:00`).toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric",
            })}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {/* Tab toggle */}
      <div className="flex gap-2 mb-8 border border-border rounded-lg p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Search tab ────────────────────────────────────────────── */}
      {tab === "search" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Search for a recipe by name. Pick a result and we&apos;ll import it automatically.
          </p>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. chicken alfredo, pad thai, shakshuka…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {searchError && <p className="text-sm text-destructive">{searchError}</p>}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => {
                const isImporting = importingUrl === result.url;
                return (
                  <button
                    key={result.url}
                    onClick={() => handleResultClick(result)}
                    disabled={importingUrl !== null}
                    className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-muted/30 transition-colors disabled:opacity-50 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {result.title}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 mb-1">{result.domain}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{result.snippet}</p>
                      </div>
                      {isImporting && (
                        <Loader2 size={16} className="animate-spin text-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!searching && query && results.length === 0 && !searchError && (
            <p className="text-sm text-muted-foreground">No results. Try a different search.</p>
          )}
        </div>
      )}

      {/* ── Import from URL tab ───────────────────────────────────── */}
      {tab === "url" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste a link to a recipe blog, website, or Pinterest page. Gemini will extract the ingredients and steps automatically.
          </p>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
          />
          <Button onClick={handleUrlImport} disabled={importing || !url.trim()} className="gap-2">
            {importing && <Loader2 size={15} className="animate-spin" />}
            {importing ? "Importing…" : "Import Recipe"}
          </Button>
        </div>
      )}

      {/* ── Manual entry tab ──────────────────────────────────────── */}
      {tab === "manual" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recipe name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Servings</label>
            <Input type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" className="w-24" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ingredients</label>
            <p className="text-xs text-muted-foreground">One per line, e.g. "2 cups flour"</p>
            <Textarea rows={8} value={ingredientsRaw} onChange={(e) => setIngredientsRaw(e.target.value)} placeholder={"2 cups flour\n1 tsp salt\n..."} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Steps</label>
            <p className="text-xs text-muted-foreground">One per line</p>
            <Textarea rows={8} value={stepsRaw} onChange={(e) => setStepsRaw(e.target.value)} placeholder={"Preheat oven to 350°F\nMix dry ingredients\n..."} />
          </div>
          <Button onClick={handleManualSave} disabled={saving || !title.trim()} className="gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Recipe"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function NewRecipePage() {
  return (
    <Suspense fallback={<div className="px-6 py-10"><div className="h-8 w-32 bg-muted rounded animate-pulse" /></div>}>
      <NewRecipeForm />
    </Suspense>
  );
}
