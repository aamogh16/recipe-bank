"use client";

import { useRouter } from "next/navigation";

export default function SpiceSortToggle({ current }: { current: "popular" | "newest" }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1 text-sm">
      {(["popular", "newest"] as const).map((s) => (
        <button
          key={s}
          onClick={() => router.push(`/spices?sort=${s}`)}
          className={`px-3 py-1 rounded-md capitalize transition-colors ${
            current === s
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
