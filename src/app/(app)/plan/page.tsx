import WeekPlanner from "./week-planner";

export default function PlanPage() {
  return (
    <div>
      <div className="px-4 pt-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Meal Planner</h1>
        <p className="text-sm text-muted-foreground">Plan what you&apos;re cooking this week.</p>
      </div>
      <WeekPlanner />
    </div>
  );
}
