"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Eye, Pencil, List, ShoppingCart } from "lucide-react";

export type RecipeMode = "viewing" | "recipe" | "list" | "shopping";

const MODES: { key: RecipeMode; label: string; icon: React.ElementType; description: string }[] = [
  { key: "viewing",  label: "Viewing",  icon: Eye,          description: "Read-only" },
  { key: "recipe",   label: "Recipe",   icon: Pencil,       description: "Edit recipe" },
  { key: "list",     label: "List",     icon: List,         description: "What to buy" },
  { key: "shopping", label: "Shopping", icon: ShoppingCart, description: "Price calculator" },
];

interface Props {
  mode: RecipeMode;
  onChange: (mode: RecipeMode) => void;
}

export default function RecipeModeSelector({ mode, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODES.find((m) => m.key === mode)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
      >
        <current.icon size={14} className="text-muted-foreground" />
        <span className="font-medium">{current.label}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-border bg-card shadow-lg py-1 overflow-hidden">
          {MODES.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors ${
                mode === key ? "bg-muted/60" : ""
              }`}
            >
              <Icon size={15} className={mode === key ? "text-primary" : "text-muted-foreground"} />
              <div>
                <p className={`text-sm font-medium ${mode === key ? "text-primary" : ""}`}>{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
