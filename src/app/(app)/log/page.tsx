export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { cookLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

function isValidUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try { new URL(url); return true; } catch { return false; }
}

export default async function LogPage() {
  const { userId } = await auth();

  const entries = await db.query.cookLog.findMany({
    where: eq(cookLog.userId, userId!),
    with: { recipe: true },
    orderBy: (c, { desc: d }) => d(c.cookedAt),
  });

  // Group by "Month Year"
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = new Date(entry.cookedAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Cook Log</h1>
      <p className="text-sm text-muted-foreground mb-10">Your cooking history, in order.</p>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <UtensilsCrossed size={40} className="text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No cooks logged yet.<br />Hit &ldquo;Log Cook&rdquo; on any recipe to get started.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {[...groups.entries()].map(([month, monthEntries]) => (
            <div key={month}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {month}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{monthEntries.length} cook{monthEntries.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="relative pl-8">
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-3">
                  {monthEntries.map((entry) => {
                    const date = new Date(entry.cookedAt);
                    const day = date.getDate();
                    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
                    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

                    return (
                      <div key={entry.id} className="relative">
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-background border-2 border-primary" />

                        <Link
                          href={`/recipes/${entry.recipeId}`}
                          className="flex gap-3 items-center rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors group"
                        >
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                            {isValidUrl(entry.recipe.photoUrl) ? (
                              <Image
                                src={entry.recipe.photoUrl}
                                alt={entry.recipe.title}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <UtensilsCrossed size={18} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {entry.recipe.title}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                            )}
                            {entry.recipe.cuisine && (
                              <p className="text-xs text-muted-foreground/60 mt-0.5">{entry.recipe.cuisine}</p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xl font-bold leading-none tabular-nums">{day}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">{weekday}</div>
                            <div className="text-xs text-muted-foreground/60 mt-0.5">{time}</div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
