import { NextResponse } from "next/server";
import { db } from "@/db";
import { cookLog } from "@/db/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entry] = await db.insert(cookLog).values({ recipeId: id }).returning();
  return NextResponse.json(entry, { status: 201 });
}
