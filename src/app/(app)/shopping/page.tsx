"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ShoppingCart, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RawItem = {
  id: string;
  ingredientName: string;
  quantity: string | null;
  unit: string | null;
  isChecked: boolean;
  createdAt: string;
  recipe: { id: string; title: string } | null;
};

type DisplayItem = {
  key: string;
  name: string;
  quantity: number | null;
  quantityDisplay: string;
  unit: string | null;
  sources: string[];
  ids: string[];
  isChecked: boolean;
};

type Sort = "name" | "recipe" | "date";
type DateRange = "all" | "today" | "week" | "month" | "3months";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: "All time",
  today: "Today",
  week: "This week",
  month: "This month",
  "3months": "Last 3 months",
};

function isWithinRange(dateStr: string, range: DateRange): boolean {
  if (range === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  const start = new Date();
  if (range === "today") { start.setHours(0, 0, 0, 0); }
  else if (range === "week") { start.setDate(now.getDate() - 7); }
  else if (range === "month") { start.setMonth(now.getMonth() - 1); }
  else if (range === "3months") { start.setMonth(now.getMonth() - 3); }
  return date >= start;
}

function fmt(qty: number | null, raw: string): string {
  if (qty === null) return raw;
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, "");
}

function combineByName(items: RawItem[]): DisplayItem[] {
  const map = new Map<string, DisplayItem>();
  for (const item of items) {
    const normName = item.ingredientName.trim();
    const normUnit = (item.unit ?? "").toLowerCase().trim();
    const key = `${normName.toLowerCase()}||${normUnit}`;
    const qty = item.quantity ? parseFloat(item.quantity) : null;
    const source = item.recipe?.title ?? null;
    if (map.has(key)) {
      const d = map.get(key)!;
      if (qty !== null && d.quantity !== null) d.quantity += qty;
      if (source && !d.sources.includes(source)) d.sources.push(source);
      d.ids.push(item.id);
      if (!item.isChecked) d.isChecked = false;
    } else {
      map.set(key, { key, name: normName, quantity: qty, quantityDisplay: item.quantity ?? "", unit: item.unit || null, sources: source ? [source] : [], ids: [item.id], isChecked: item.isChecked });
    }
  }
  return [...map.values()].map((d) => ({ ...d, quantityDisplay: fmt(d.quantity, d.quantityDisplay) }));
}

function toDisplayItem(item: RawItem): DisplayItem {
  const qty = item.quantity ? parseFloat(item.quantity) : null;
  return {
    key: item.id,
    name: item.ingredientName.trim(),
    quantity: qty,
    quantityDisplay: fmt(qty, item.quantity ?? ""),
    unit: item.unit || null,
    sources: item.recipe ? [item.recipe.title] : [],
    ids: [item.id],
    isChecked: item.isChecked,
  };
}

export default function ShoppingPage() {
  const [items, setItems] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("name");
  const [recipeFilter, setRecipeFilter] = useState<string>("all");
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);
  const recipeDropdownRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/shopping");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (recipeDropdownRef.current && !recipeDropdownRef.current.contains(e.target as Node)) setRecipeDropdownOpen(false);
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) setDateDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function toggleItem(ids: string[], checked: boolean) {
    setItems((prev) => prev.map((i) => ids.includes(i.id) ? { ...i, isChecked: checked } : i));
    await Promise.all(ids.map((id) => fetch(`/api/shopping/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isChecked: checked }),
    })));
  }

  async function deleteItems(ids: string[]) {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    await Promise.all(ids.map((id) => fetch(`/api/shopping/items/${id}`, { method: "DELETE" })));
  }

  async function clearChecked() {
    setItems((prev) => prev.filter((i) => !i.isChecked));
    await fetch("/api/shopping", { method: "DELETE" });
  }

  async function deleteAll() {
    if (!confirm("Delete everything on your shopping list?")) return;
    setItems([]);
    await fetch("/api/shopping?all=true", { method: "DELETE" });
  }

  async function addItem() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientName: newName, quantity: newQty || null, unit: newUnit || null }),
    });
    const item = await res.json();
    setItems((prev) => [...prev, { ...item, recipe: null }]);
    setNewName(""); setNewQty(""); setNewUnit("");
    setAdding(false);
    setShowAdd(false);
  }

  const checkedCount = items.filter((i) => i.isChecked).length;

  // Unique recipe sources for the filter dropdown
  const recipeOptions = Array.from(
    new Map(items.filter((i) => i.recipe).map((i) => [i.recipe!.id, i.recipe!.title])).entries()
  );

  // Apply filters
  const filteredItems = items
    .filter((i) => recipeFilter === "all" ? true : recipeFilter === "manual" ? !i.recipe : i.recipe?.id === recipeFilter)
    .filter((i) => sort === "date" ? isWithinRange(i.createdAt, dateRange) : true);

  // Build display based on sort
  let content: React.ReactNode;

  if (sort === "name") {
    const combined = combineByName(filteredItems);
    const unchecked = combined.filter((d) => !d.isChecked).sort((a, b) => a.name.localeCompare(b.name));
    const checked = combined.filter((d) => d.isChecked).sort((a, b) => a.name.localeCompare(b.name));
    content = (
      <>
        {unchecked.map((d) => <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, true)} onDelete={() => deleteItems(d.ids)} />)}
        {checked.length > 0 && <SectionHeader label="Checked" />}
        {checked.map((d) => <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, false)} onDelete={() => deleteItems(d.ids)} />)}
      </>
    );
  } else if (sort === "recipe") {
    const groups = new Map<string, RawItem[]>();
    for (const item of filteredItems) {
      const key = item.recipe?.title ?? "Manually Added";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    content = (
      <>
        {[...groups.entries()].map(([groupName, groupItems]) => {
          const display = groupItems.map(toDisplayItem);
          const unchecked = display.filter((d) => !d.isChecked);
          const checked = display.filter((d) => d.isChecked);
          return (
            <div key={groupName} className="mb-4">
              <SectionHeader label={groupName} />
              {unchecked.map((d) => <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, true)} onDelete={() => deleteItems(d.ids)} />)}
              {checked.map((d) => <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, false)} onDelete={() => deleteItems(d.ids)} />)}
            </div>
          );
        })}
      </>
    );
  } else {
    const sorted = [...filteredItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unchecked = sorted.filter((i) => !i.isChecked).map(toDisplayItem);
    const checked = sorted.filter((i) => i.isChecked).map(toDisplayItem);
    content = (
      <>
        {unchecked.map((d) => <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, true)} onDelete={() => deleteItems(d.ids)} />)}
        {checked.length > 0 && <SectionHeader label="Checked" />}
        {checked.map((d) => <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, false)} onDelete={() => deleteItems(d.ids)} />)}
      </>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-10 max-w-2xl mx-auto space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="px-6 py-10 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold tracking-tight">Shopping List</h1>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={14} /> Add
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {items.length === 0 ? "Your list is empty." : `${items.length} item${items.length !== 1 ? "s" : ""} · ${checkedCount} checked`}
      </p>

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          {/* Sort toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1 text-sm">
            {(["name", "recipe", "date"] as Sort[]).map((s) => (
              <div
                key={s}
                className="relative"
                ref={s === "recipe" ? recipeDropdownRef : s === "date" ? dateDropdownRef : undefined}
              >
                <button
                  onClick={() => {
                    setSort(s);
                    if (s === "recipe") { setRecipeDropdownOpen((o) => sort === "recipe" ? !o : true); setDateDropdownOpen(false); }
                    else if (s === "date") { setDateDropdownOpen((o) => sort === "date" ? !o : true); setRecipeDropdownOpen(false); }
                    else { setRecipeDropdownOpen(false); setDateDropdownOpen(false); }
                  }}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s === "recipe" && recipeFilter !== "all"
                    ? (recipeFilter === "manual" ? "Manual" : (recipeOptions.find(([id]) => id === recipeFilter)?.[1]?.split(" ")[0] ?? "Recipe"))
                    : s === "date" && dateRange !== "all"
                    ? DATE_RANGE_LABELS[dateRange].split(" ")[1] ?? DATE_RANGE_LABELS[dateRange]
                    : s}
                </button>

                {/* Recipe dropdown */}
                {s === "recipe" && recipeDropdownOpen && recipeOptions.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 z-50 min-w-52 rounded-lg border border-border bg-card shadow-lg py-1">
                    <button onClick={() => { setRecipeFilter("all"); setRecipeDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${recipeFilter === "all" ? "font-medium" : "text-muted-foreground"}`}>All recipes</button>
                    {recipeOptions.map(([id, title]) => (
                      <button key={id} onClick={() => { setRecipeFilter(id); setRecipeDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate ${recipeFilter === id ? "font-medium" : "text-muted-foreground"}`}>{title}</button>
                    ))}
                    <button onClick={() => { setRecipeFilter("manual"); setRecipeDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${recipeFilter === "manual" ? "font-medium" : "text-muted-foreground"}`}>Manually added</button>
                  </div>
                )}

                {/* Date dropdown */}
                {s === "date" && dateDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 min-w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                    {(Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]).map(([range, label]) => (
                      <button key={range} onClick={() => { setDateRange(range); setDateDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${dateRange === range ? "font-medium" : "text-muted-foreground"}`}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {checkedCount > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs" onClick={clearChecked}>
                <X size={12} /> Clear {checkedCount} checked
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive text-xs" onClick={deleteAll}>
              <Trash2 size={12} /> Delete all
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <ShoppingCart size={40} className="text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Add ingredients from a recipe or tap + Add.</p>
        </div>
      ) : (
        <div>
          {/* Inline add form */}
          {showAdd && (
            <div className="flex gap-2 mb-4 items-start flex-wrap">
              <Input className="w-20 shrink-0" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
              <Input className="w-24 shrink-0" placeholder="Unit" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
              <Input
                className="flex-1 min-w-32"
                placeholder="Ingredient name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                autoFocus
              />
              <Button size="sm" onClick={addItem} disabled={adding || !newName.trim()} className="gap-1">
                <Check size={14} /> Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}><X size={14} /></Button>
            </div>
          )}

          {content}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ItemRow({ item, onToggle, onDelete }: { item: DisplayItem; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-border group transition-opacity ${item.isChecked ? "opacity-40" : ""}`}>
      <button
        onClick={onToggle}
        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.isChecked ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}
      >
        {item.isChecked && <Check size={11} className="text-primary-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${item.isChecked ? "line-through" : ""}`}>{item.name}</span>
        {item.sources.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground/60">{item.sources.join(", ")}</span>
        )}
      </div>
      {(item.quantityDisplay || item.unit) && (
        <span className="text-sm font-semibold tabular-nums shrink-0 text-muted-foreground">
          {[item.quantityDisplay, item.unit].filter(Boolean).join(" ")}
        </span>
      )}
      <button onClick={onDelete} className="shrink-0 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
