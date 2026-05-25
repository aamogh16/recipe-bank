import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customSpices } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select({ name: customSpices.name })
    .from(customSpices)
    .where(eq(customSpices.userId, userId));

  return NextResponse.json(rows.map((r) => r.name));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const [row] = await db.insert(customSpices).values({ userId, name: name.trim() }).returning();
  return NextResponse.json(row, { status: 201 });
}
