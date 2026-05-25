import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(mealPlans).where(eq(mealPlans.id, id));
  return new NextResponse(null, { status: 204 });
}
