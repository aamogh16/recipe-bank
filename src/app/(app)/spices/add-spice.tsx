"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AddSpice() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    await fetch("/api/spices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setAdding(false);
    router.refresh(); // re-run the server page so the new spice appears
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="Add spice to master list…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        className="h-8 text-sm max-w-56"
      />
      <button
        onClick={handleAdd}
        disabled={adding || !name.trim()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
      >
        {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        Add
      </button>
    </div>
  );
}
