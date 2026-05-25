"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export default function AddSpice() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1"
        title="Add spice to master list"
      >
        <Plus size={12} />
        add spice
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") { setOpen(false); setName(""); }
        }}
        placeholder="spice name…"
        className="w-36 bg-transparent border-b border-border text-xs text-foreground placeholder:text-muted-foreground/50 outline-none py-0.5"
      />
      <button
        onClick={handleAdd}
        disabled={adding || !name.trim()}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        {adding ? <Loader2 size={12} className="animate-spin" /> : "add"}
      </button>
      <button
        onClick={() => { setOpen(false); setName(""); }}
        className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        cancel
      </button>
    </div>
  );
}
