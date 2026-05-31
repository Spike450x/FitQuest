import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/**
 * Titled settings section used across the Profile and Settings pages — a `Card`
 * with a small heading + description above arbitrary content.
 */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card variant="default" padding="lg">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </Card>
  );
}
