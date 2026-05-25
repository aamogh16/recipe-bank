import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { date, mealType } = await req.json();
  const [updated] = await db
    .update(mealPlans)
    .set({ date, mealType })
    .where(eq(mealPlans.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(mealPlans).where(eq(mealPlans.id, id));
  return new NextResponse(null, { status: 204 });
}
