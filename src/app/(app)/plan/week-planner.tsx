"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft, ChevronRight, Coffee, Sun, Moon,
  Plus, X, Search, UtensilsCrossed, GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type MealType = "breakfast" | "lunch" | "dinner";
type Plan = {
  id: string; date: string; mealType: MealType;
  recipe: { id: string; title: string; photoUrl: string | null; totalTimeMinutes: number | null; cuisine: string | null };
};
type RecipeSummary = {
  id: string; title: string; photoUrl: string | null;
  totalTimeMinutes: number | null; cuisine: string | null;
};

const MEALS: MealType[] = ["breakfast", "lunch", "dinner"];
const MEAL_META: Record<MealType, { label: string; Icon: React.ElementType; color: string }> = {
  breakfast: { label: "Breakfast", Icon: Coffee, color: "text-amber-400" },
  lunch:     { label: "Lunch",     Icon: Sun,    color: "text-emerald-400" },
  dinner:    { label: "Dinner",    Icon: Moon,   color: "text-violet-400" },
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number): Date {
  const date = new Date(d); date.setDate(date.getDate() + n); return date;
}
function isoDate(d: Date): string { return d.toISOString().split("T")[0]; }
function slotId(date: string, meal: MealType) { return `${date}||${meal}`; }

// ── Draggable filled slot ────────────────────────────────────────────────────

function DraggableMealSlot({ plan, onRemove, onSwap }: { plan: Plan; onRemove: () => void; onSwap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: plan.id, data: { plan } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className="flex-1 flex items-center justify-between gap-2 min-w-0"
    >
      <div
        {...listeners} {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 shrink-0 touch-none"
      >
        <GripVertical size={14} />
      </div>
      <Link href={`/recipes/${plan.recipe.id}`} className="text-sm truncate hover:text-primary transition-colors flex-1">
        {plan.recipe.title}
      </Link>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onSwap} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors">
          swap
        </button>
        <button onClick={onRemove} className="p-1 text-muted-foreground/60 hover:text-destructive transition-colors rounded">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Droppable slot row ───────────────────────────────────────────────────────

function DroppableMealRow({ date, meal, plan, isDragging, onAdd, onRemove, onSwap }: {
  date: string; meal: MealType; plan: Plan | undefined;
  isDragging: boolean; onAdd: () => void; onRemove: () => void; onSwap: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId(date, meal) });
  const { label, Icon, color } = MEAL_META[meal];
  const highlight = isDragging && isOver;
  const canDrop = isDragging && !plan && !isOver;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 px-4 py-2.5 min-h-[44px] transition-colors ${highlight ? "bg-primary/10" : canDrop ? "bg-muted/20" : ""}`}
    >
      <Icon size={13} className={`shrink-0 ${color}`} />
      <span className="text-xs text-muted-foreground w-[68px] shrink-0">{label}</span>
      {plan ? (
        <DraggableMealSlot plan={plan} onRemove={onRemove} onSwap={onSwap} />
      ) : (
        <button onClick={onAdd} className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <Plus size={12} />Add
        </button>
      )}
    </div>
  );
}

// ── Floating drag preview ────────────────────────────────────────────────────

function DragPreview({ plan }: { plan: Plan }) {
  return (
    <div className="bg-card border border-primary/50 rounded-lg px-3 py-2 shadow-xl flex items-center gap-2 text-sm font-medium max-w-[220px] pointer-events-none">
      <GripVertical size={13} className="text-muted-foreground shrink-0" />
      <span className="truncate">{plan.recipe.title}</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function WeekPlanner() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{ date: string; meal: MealType } | null>(null);
  const [allRecipes, setAllRecipes] = useState<RecipeSummary[]>([]);
  const [search, setSearch] = useState("");
  const [recipesLoading, setRecipesLoading] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/plan?start=${isoDate(weekStart)}&end=${isoDate(weekEnd)}`);
    setPlans(await res.json());
    setLoading(false);
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPlans(); }, [loadPlans]);

  useEffect(() => {
    if (!pickerTarget) return;
    setRecipesLoading(true);
    fetch("/api/recipes").then(r => r.json()).then((data) => { setAllRecipes(data); setRecipesLoading(false); });
  }, [pickerTarget]);

  // DnD sensors — PointerSensor for mouse, TouchSensor for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActivePlan(plans.find(p => p.id === active.id) ?? null);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActivePlan(null);
    if (!over) return;

    const dragged = plans.find(p => p.id === active.id);
    if (!dragged) return;

    const [overDate, overMeal] = (over.id as string).split("||") as [string, MealType];
    if (dragged.date === overDate && dragged.mealType === overMeal) return;

    const target = plans.find(p => p.date === overDate && p.mealType === overMeal);

    // Optimistic update
    setPlans(prev => prev.map(p => {
      if (p.id === dragged.id) return { ...p, date: overDate, mealType: overMeal };
      if (target && p.id === target.id) return { ...p, date: dragged.date, mealType: dragged.mealType };
      return p;
    }));

    if (target) {
      // Swap: delete target → move dragged → recreate target at original slot
      await fetch(`/api/plan/${target.id}`, { method: "DELETE" });
      await fetch(`/api/plan/${dragged.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: overDate, mealType: overMeal }),
      });
      await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dragged.date, mealType: dragged.mealType, recipeId: target.recipe.id }),
      });
      loadPlans(); // refresh IDs after swap creates a new row
    } else {
      await fetch(`/api/plan/${dragged.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: overDate, mealType: overMeal }),
      });
    }
  }

  function openPicker(date: string, meal: MealType) { setPickerTarget({ date, meal }); setSearch(""); }

  async function assign(recipeId: string) {
    if (!pickerTarget) return;
    await fetch("/api/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: pickerTarget.date, mealType: pickerTarget.meal, recipeId }),
    });
    setPickerTarget(null);
    loadPlans();
  }

  async function remove(planId: string) {
    setPlans(prev => prev.filter(p => p.id !== planId));
    await fetch(`/api/plan/${planId}`, { method: "DELETE" });
  }

  const today = isoDate(new Date());
  const filtered = allRecipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="px-4 py-8 max-w-xl mx-auto">

        {/* Week nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setWeekStart(prev => addDays(prev, -7))} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-medium tabular-nums">{weekLabel}</p>
          <button onClick={() => setWeekStart(prev => addDays(prev, 7))} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {isoDate(weekStart) !== isoDate(getMonday(new Date())) && (
          <div className="flex justify-center mb-4">
            <button onClick={() => setWeekStart(getMonday(new Date()))} className="text-xs text-primary underline underline-offset-2">
              Back to this week
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {days.map(day => {
              const dateStr = isoDate(day);
              const isToday = dateStr === today;
              const dayPlans = plans.filter(p => p.date === dateStr);
              return (
                <div key={dateStr} className={`rounded-xl border bg-card overflow-hidden ${isToday ? "border-primary/60" : "border-border"}`}>
                  <div className={`px-4 py-2 flex items-center gap-2 border-b border-border ${isToday ? "bg-primary/5" : ""}`}>
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                      {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-border/60">
                    {MEALS.map(meal => {
                      const plan = dayPlans.find(p => p.mealType === meal);
                      return (
                        <DroppableMealRow
                          key={meal}
                          date={dateStr} meal={meal} plan={plan}
                          isDragging={!!activePlan}
                          onAdd={() => openPicker(dateStr, meal)}
                          onRemove={() => plan && remove(plan.id)}
                          onSwap={() => openPicker(dateStr, meal)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating preview while dragging */}
      <DragOverlay dropAnimation={null}>
        {activePlan ? <DragPreview plan={activePlan} /> : null}
      </DragOverlay>

      {/* Recipe picker bottom sheet */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPickerTarget(null)} />
          <div className="relative z-10 bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-md flex flex-col max-h-[85vh]">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">
                {MEAL_META[pickerTarget.meal].label} ·{" "}
                {new Date(`${pickerTarget.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <button onClick={() => setPickerTarget(null)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8 h-9 text-sm" placeholder="Search your recipes…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {recipesLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  {search ? `No recipes matching "${search}"` : "No recipes yet."}
                </p>
              ) : (
                filtered.map(recipe => (
                  <button key={recipe.id} onClick={() => assign(recipe.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border/40 last:border-0">
                    <div className="w-10 h-10 rounded-lg bg-muted shrink-0 overflow-hidden">
                      {recipe.photoUrl
                        ? <img src={recipe.photoUrl} alt={recipe.title} className="w-full h-full object-cover" />
                        : <div className="flex items-center justify-center h-full"><UtensilsCrossed size={13} className="text-muted-foreground" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{recipe.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[recipe.cuisine, recipe.totalTimeMinutes ? `${recipe.totalTimeMinutes} min` : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Link
                href={`/recipes/new?date=${pickerTarget.date}&meal=${pickerTarget.meal}`}
                onClick={() => setPickerTarget(null)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors"
              >
                <Plus size={14} />Import a new recipe
              </Link>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
