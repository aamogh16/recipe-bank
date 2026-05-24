"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RawItem = {
  id: string;
  ingredientName: string;
  quantity: string | null;
  unit: string | null;
  isChecked: boolean;
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

function combineItems(items: RawItem[]): DisplayItem[] {
  const map = new Map<string, DisplayItem>();

  for (const item of items) {
    const normName = item.ingredientName.trim();
    const normUnit = (item.unit ?? "").toLowerCase().trim();
    const key = `${normName.toLowerCase()}||${normUnit}`;

    const qty = item.quantity ? parseFloat(item.quantity) : null;
    const source = item.recipe?.title ?? null;

    if (map.has(key)) {
      const d = map.get(key)!;
      if (qty !== null && d.quantity !== null) {
        d.quantity = d.quantity + qty;
      } else if (qty !== null && d.quantity === null) {
        d.quantity = qty;
      }
      if (source && !d.sources.includes(source)) d.sources.push(source);
      d.ids.push(item.id);
      if (!item.isChecked) d.isChecked = false;
    } else {
      map.set(key, {
        key,
        name: normName,
        quantity: qty,
        quantityDisplay: item.quantity ?? "",
        unit: item.unit || null,
        sources: source ? [source] : [],
        ids: [item.id],
        isChecked: item.isChecked,
      });
    }
  }

  // Format combined quantities
  const result = [...map.values()];
  for (const d of result) {
    if (d.quantity !== null) {
      d.quantityDisplay = Number.isInteger(d.quantity)
        ? d.quantity.toString()
        : d.quantity.toFixed(2).replace(/\.?0+$/, "");
    }
  }

  return result.sort((a, b) => {
    if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

export default function ShoppingPage() {
  const [items, setItems] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const display = combineItems(items);
  const checkedCount = items.filter((i) => i.isChecked).length;
  const unchecked = display.filter((d) => !d.isChecked);
  const checked = display.filter((d) => d.isChecked);

  if (loading) {
    return (
      <div className="px-6 py-10 max-w-2xl mx-auto space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-6 py-10 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold tracking-tight">Shopping List</h1>
        {checkedCount > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs" onClick={clearChecked}>
            <X size={12} /> Clear {checkedCount} checked
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {items.length === 0 ? "Add ingredients from a recipe or manually below." : `${items.length} item${items.length !== 1 ? "s" : ""} · ${checkedCount} checked`}
      </p>

      {items.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <ShoppingCart size={40} className="text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Your list is empty.<br />Add ingredients from a recipe or tap below.</p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add item
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Unchecked items */}
          {unchecked.map((d) => (
            <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, !d.isChecked)} onDelete={() => deleteItems(d.ids)} />
          ))}

          {/* Checked items */}
          {checked.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Checked</p>
              </div>
              {checked.map((d) => (
                <ItemRow key={d.key} item={d} onToggle={() => toggleItem(d.ids, !d.isChecked)} onDelete={() => deleteItems(d.ids)} />
              ))}
            </>
          )}

          {/* Add item */}
          {showAdd ? (
            <div className="flex gap-2 pt-4 items-start flex-wrap">
              <Input
                className="w-20 shrink-0"
                placeholder="Qty"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
              <Input
                className="w-24 shrink-0"
                placeholder="Unit"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
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
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                <X size={14} />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={15} /> Add item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, onToggle, onDelete }: {
  item: DisplayItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-border group transition-opacity ${item.isChecked ? "opacity-50" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          item.isChecked ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
        }`}
      >
        {item.isChecked && <Check size={11} className="text-primary-foreground" />}
      </button>

      {/* Name + source */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${item.isChecked ? "line-through" : ""}`}>{item.name}</span>
        {item.sources.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground/60">{item.sources.join(", ")}</span>
        )}
      </div>

      {/* Quantity */}
      {(item.quantityDisplay || item.unit) && (
        <span className="text-sm font-semibold tabular-nums shrink-0 text-muted-foreground">
          {[item.quantityDisplay, item.unit].filter(Boolean).join(" ")}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
