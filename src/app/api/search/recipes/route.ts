import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

type SerperOrganic = {
  title: string;
  link: string;
  snippet: string;
  displayedLink: string;
};

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Search not configured" }, { status: 503 });

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: `${q} recipe -site:youtube.com`, num: 10 }),
  });

  if (!res.ok) return NextResponse.json({ error: "Search failed" }, { status: 502 });

  const data = await res.json();
  const results = ((data.organic ?? []) as SerperOrganic[])
    .filter((r) => !r.link.includes("youtube.com"))
    .slice(0, 5)
    .map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    domain: r.displayedLink,
  }));

  return NextResponse.json(results);
}
