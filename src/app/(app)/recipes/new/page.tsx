"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link2, PenLine, Loader2 } from "lucide-react";

type Tab = "url" | "manual";

export default function NewRecipePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("url");

  // URL import state
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Manual entry state
  const [title, setTitle] = useState("");
  const [ingredientsRaw, setIngredientsRaw] = useState("");
  const [stepsRaw, setStepsRaw] = useState("");
  const [servings, setServings] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleImport() {
    if (!url.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(`Import failed: ${data.detail ?? data.error ?? res.status}`);
        setImporting(false);
        return;
      }
      router.push(`/recipes/${data.id}`);
    } catch (err) {
      setImportError(`Unexpected error: ${String(err)}`);
      setImporting(false);
    }
  }

  async function handleManualSave() {
    if (!title.trim()) return;
    setSaving(true);

    const ingredients = ingredientsRaw
      .split("\n")
      .filter(Boolean)
      .map((line) => ({ group: "", name: line.trim(), quantity: "", unit: "" }));

    const steps = stepsRaw
      .split("\n")
      .filter(Boolean)
      .map((line, i) => ({ order: i + 1, text: line.trim() }));

    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        ingredients,
        steps,
        originalServings: servings ? parseInt(servings) : null,
        currentServings: servings ? parseInt(servings) : null,
        sourceType: "manual",
      }),
    });

    const recipe = await res.json();
    router.push(`/recipes/${recipe.id}`);
  }

  return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Add Recipe</h1>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-8 border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("url")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 size={15} />
          Import from URL
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenLine size={15} />
          Enter Manually
        </button>
      </div>

      {tab === "url" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste a link to a recipe blog, website, or Pinterest page. Gemini will extract the ingredients and steps automatically.
          </p>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImport()}
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <Button onClick={handleImport} disabled={importing || !url.trim()} className="gap-2">
            {importing && <Loader2 size={15} className="animate-spin" />}
            {importing ? "Importing…" : "Import Recipe"}
          </Button>
        </div>
      )}

      {tab === "manual" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recipe name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Servings</label>
            <Input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="4"
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ingredients</label>
            <p className="text-xs text-muted-foreground">One per line, e.g. "2 cups flour"</p>
            <Textarea
              rows={8}
              value={ingredientsRaw}
              onChange={(e) => setIngredientsRaw(e.target.value)}
              placeholder={"2 cups flour\n1 tsp salt\n..."}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Steps</label>
            <p className="text-xs text-muted-foreground">One per line</p>
            <Textarea
              rows={8}
              value={stepsRaw}
              onChange={(e) => setStepsRaw(e.target.value)}
              placeholder={"Preheat oven to 350°F\nMix dry ingredients\n..."}
            />
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
