import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end required" }, { status: 400 });

  const plans = await db.query.mealPlans.findMany({
    where: and(gte(mealPlans.date, start), lte(mealPlans.date, end)),
    with: {
      recipe: {
        columns: { id: true, title: true, photoUrl: true, totalTimeMinutes: true, cuisine: true },
      },
    },
    orderBy: (p, { asc }) => asc(p.date),
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const { date, mealType, recipeId } = await req.json();
  if (!date || !mealType || !recipeId) {
    return NextResponse.json({ error: "date, mealType, recipeId required" }, { status: 400 });
  }

  // Upsert: remove existing slot then insert
  await db.delete(mealPlans).where(
    and(eq(mealPlans.date, date), eq(mealPlans.mealType, mealType))
  );
  const [plan] = await db.insert(mealPlans).values({ date, mealType, recipeId }).returning();
  return NextResponse.json(plan, { status: 201 });
}
