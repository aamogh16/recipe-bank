import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipeNotes } from "@/db/schema";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content } = await req.json();
  const [note] = await db.insert(recipeNotes).values({ recipeId: id, content }).returning();
  return NextResponse.json(note, { status: 201 });
}
