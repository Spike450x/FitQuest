import { ActivityLogForm } from "@/components/activities/ActivityLogForm";

export default function ActivitiesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your workouts, steps, sleep, water, and nutrition to earn XP and grow your stats.
        </p>
      </div>

      {/* Post-MVP: Apple Health sync */}
      <div className="flex items-start gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3">
        <span className="text-xl mt-0.5">🍎</span>
        <div>
          <p className="text-sm font-medium text-gray-600">Apple Health sync — Post-MVP</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Explore live-syncing steps, sleep, and workouts directly from Apple Health so logging happens automatically.
          </p>
        </div>
      </div>

      <ActivityLogForm />
    </div>
  );
}
