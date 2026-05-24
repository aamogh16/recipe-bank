"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Edit = {
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  cuisine: "Cuisine",
  dishType: "Dish Type",
  complexity: "Complexity",
  prepTimeMinutes: "Prep Time",
  totalTimeMinutes: "Total Time",
  originalServings: "Servings",
  currentServings: "Current Servings",
  ingredients: "Ingredients",
  steps: "Instructions",
};

function formatValue(field: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (field === "ingredients" && Array.isArray(val)) return `${val.length} ingredient${val.length !== 1 ? "s" : ""}`;
  if (field === "steps" && Array.isArray(val)) return `${val.length} step${val.length !== 1 ? "s" : ""}`;
  if (field === "prepTimeMinutes" || field === "totalTimeMinutes") return `${val} min`;
  return String(val);
}

export default function RecipeEditsSection({ edits }: { edits: Edit[] }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Recipe Edits ({edits.length})
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {edits.map((edit) => (
            <div key={edit.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium">{FIELD_LABELS[edit.field] ?? edit.field}</span>
                <span className="text-muted-foreground shrink-0">
                  {new Date(edit.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="line-through">{formatValue(edit.field, edit.oldValue)}</span>
                <span>→</span>
                <span className="text-foreground">{formatValue(edit.field, edit.newValue)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
