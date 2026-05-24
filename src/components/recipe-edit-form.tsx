"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, X, Check, Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import type { Recipe, Ingredient, Step } from "@/db/schema";

const UNIT_PATTERN = /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\.\-]+)\s*(tsp|tbsp|teaspoon|tablespoons?|cup|oz|ounce|pound|lb|g|gram|kg|ml|liter|unit|clove|cloves|inch|slice|slices|pkg|package|can|bunch|sprig|stalk|head|pinch|dash|drop|piece|pieces)\s+(.+)$/i;

function splitIngredient(ing: Ingredient): Ingredient {
  if (ing.quantity || ing.unit) return ing;
  const m = ing.name.match(UNIT_PATTERN);
  if (!m) return ing;
  return { ...ing, quantity: m[1].trim(), unit: m[2].trim(), name: m[3].trim() };
}

interface Props {
  recipe: Recipe;
}

export default function RecipeEditForm({ recipe }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialIngredients = recipe.ingredients as Ingredient[];
  const initialSteps = recipe.steps as Step[];

  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [cuisine, setCuisine] = useState(recipe.cuisine ?? "");
  const [dishType, setDishType] = useState(recipe.dishType ?? "");
  const [complexity, setComplexity] = useState<string>(recipe.complexity ?? "");
  const [prepTime, setPrepTime] = useState(recipe.prepTimeMinutes?.toString() ?? "");
  const [totalTime, setTotalTime] = useState(recipe.totalTimeMinutes?.toString() ?? "");
  const [servings, setServings] = useState(recipe.originalServings?.toString() ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [steps, setSteps] = useState<Step[]>(initialSteps);

  function cancel() {
    setTitle(recipe.title);
    setDescription(recipe.description ?? "");
    setCuisine(recipe.cuisine ?? "");
    setDishType(recipe.dishType ?? "");
    setComplexity(recipe.complexity ?? "");
    setPrepTime(recipe.prepTimeMinutes?.toString() ?? "");
    setTotalTime(recipe.totalTimeMinutes?.toString() ?? "");
    setServings(recipe.originalServings?.toString() ?? "");
    setIngredients(initialIngredients);
    setSteps(initialSteps);
    setIsEditing(false);
  }

  async function save() {
    setSaving(true);
    const renumbered = steps.map((s, i) => ({ ...s, order: i + 1 }));
    await fetch(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || recipe.title,
        description: description.trim() || null,
        cuisine: cuisine.trim() || null,
        dishType: dishType.trim() || null,
        complexity: complexity || null,
        prepTimeMinutes: prepTime ? parseInt(prepTime) : null,
        totalTimeMinutes: totalTime ? parseInt(totalTime) : null,
        originalServings: servings ? parseInt(servings) : null,
        currentServings: servings ? parseInt(servings) : null,
        ingredients,
        steps: renumbered,
      }),
    });
    setSaving(false);
    setIsEditing(false);
    router.refresh();
  }

  function updateIng(idx: number, field: keyof Ingredient, val: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: val } : ing)));
  }
  function removeIng(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }
  function addIng() {
    setIngredients((prev) => [...prev, { group: "", quantity: "", unit: "", name: "" }]);
  }

  function updateStep(idx: number, text: string) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, text } : s)));
  }
  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }
  function addStep() {
    setSteps((prev) => [...prev, { order: prev.length + 1, text: "" }]);
  }

  const groups = [...new Set(ingredients.map((i) => i.group))];

  async function addIngToList(ing: Ingredient) {
    await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientName: ing.name, quantity: ing.quantity || null, unit: ing.unit || null }),
    });
  }

  if (!isEditing) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <span />
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => { setIngredients(initialIngredients.map(splitIngredient)); setIsEditing(true); }}>
            <Pencil size={13} /> Edit
          </Button>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{recipe.description}</p>
        )}

        {/* Ingredients */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Ingredients</h2>
          {groups.map((group) => (
            <div key={group} className="mb-6">
              {group && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1 border-b border-border">
                  {group}
                </h3>
              )}
              <ul className="divide-y divide-border">
                {ingredients
                  .filter((i) => i.group === group)
                  .map((ing, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-4 py-2.5 group">
                      <span className="text-sm">{ing.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {(ing.quantity || ing.unit) && (
                          <span className="text-sm font-bold tabular-nums">
                            {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
                          </span>
                        )}
                        <button
                          onClick={() => addIngToList(ing)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          title="Add to shopping list"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Editing</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cancel} disabled={saving}>
            <X size={13} className="mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="gap-1">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Title */}
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      {/* Description */}
      <Field label="Description">
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description…" />
      </Field>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuisine">
          <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="e.g. Indian" />
        </Field>
        <Field label="Dish Type">
          <Input value={dishType} onChange={(e) => setDishType(e.target.value)} placeholder="e.g. Curry" />
        </Field>
        <Field label="Complexity">
          <select
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">—</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
        <Field label="Servings">
          <Input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
        </Field>
        <Field label="Prep (min)">
          <Input type="number" min="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="15" />
        </Field>
        <Field label="Total (min)">
          <Input type="number" min="0" value={totalTime} onChange={(e) => setTotalTime(e.target.value)} placeholder="45" />
        </Field>
      </div>

      {/* Ingredients */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ingredients</p>
        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                className="w-16 shrink-0"
                placeholder="Qty"
                value={ing.quantity}
                onChange={(e) => updateIng(idx, "quantity", e.target.value)}
              />
              <Input
                className="w-20 shrink-0"
                placeholder="Unit"
                value={ing.unit}
                onChange={(e) => updateIng(idx, "unit", e.target.value)}
              />
              <Input
                className="flex-1 min-w-0"
                placeholder="Name"
                value={ing.name}
                onChange={(e) => updateIng(idx, "name", e.target.value)}
              />
              <button
                onClick={() => removeIng(idx)}
                className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={addIng}>
          <Plus size={12} /> Add Ingredient
        </Button>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instructions</p>
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold mt-2.5">
                {idx + 1}
              </span>
              <Textarea
                className="flex-1"
                rows={2}
                value={step.text}
                onChange={(e) => updateStep(idx, e.target.value)}
                placeholder={`Step ${idx + 1}…`}
              />
              <button
                onClick={() => removeStep(idx)}
                className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors mt-2.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={addStep}>
          <Plus size={12} /> Add Step
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
