import { ActivityLogForm } from '@/components/activities/ActivityLogForm';
import { ActivitySidePanel } from '@/components/activities/ActivitySidePanel';

export default function ActivitiesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 tracking-tight">
          Log Activity
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track workouts, steps, sleep, water, and nutrition to build mastery and restore resources.
        </p>
      </div>

      {/* Apple Health sync — Post-MVP */}
      <div className="flex items-start gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3">
        <span className="text-xl mt-0.5">🍎</span>
        <div>
          <p className="text-sm font-medium text-gray-600">Apple Health sync — Post-MVP</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Explore live-syncing steps, sleep, and workouts directly from Apple Health so logging
            happens automatically.
          </p>
        </div>
      </div>

      {/* Two-column layout: form + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityLogForm />
        </div>
        <div>
          <ActivitySidePanel />
        </div>
      </div>
    </div>
  );
}
