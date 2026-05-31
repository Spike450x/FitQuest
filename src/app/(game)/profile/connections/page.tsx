'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { useHealthConnections } from '@/hooks/useHealthConnections';
import { createConnectAuthUrl, HEALTH_SYNC_ENABLED, type ConnectProvider } from '@/lib/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { toast } from '@/components/ui/Toaster';
import type { HealthConnection } from '@/types';

// Friendly labels + glyphs keyed by the lowercase provider code on the doc.
const PROVIDER_LABELS: Record<string, { name: string; glyph: string }> = {
  strava: { name: 'Strava', glyph: '🏅' },
  garmin: { name: 'Garmin', glyph: '⌚' },
};

function providerLabel(code: string): { name: string; glyph: string } {
  return PROVIDER_LABELS[code] ?? { name: code, glyph: '🔗' };
}

export default function ConnectionsPage() {
  const { character, user } = useCharacter();
  const { connections, loading } = useHealthConnections(user?.uid);
  const [connecting, setConnecting] = useState<ConnectProvider | null>(null);

  // Surface the post-redirect outcome without forcing a Suspense boundary
  // (reading window.location avoids the useSearchParams prerender constraint).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      toast('🎉 Device connected', {
        description: 'Your activity will sync automatically from now on.',
      });
    } else if (params.get('error') === '1') {
      toast('Connection failed', { description: 'Nothing was linked. Please try again.' });
    }
    if (params.has('connected') || params.has('error')) {
      window.history.replaceState({}, '', '/profile/connections');
    }
  }, []);

  if (!character || !user) return null;

  async function handleConnect(provider: ConnectProvider) {
    setConnecting(provider);
    try {
      const { url } = await createConnectAuthUrl(provider, {
        returnOrigin: window.location.origin,
      });
      window.location.href = url;
    } catch (err) {
      const message = (err as { message?: string }).message ?? 'Could not start the connection.';
      toast('Connection failed', { description: message });
      setConnecting(null);
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <Link
          href="/profile"
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
        >
          ← Account Settings
        </Link>
        <Heading level={1} className="mt-1">
          Connected Devices
        </Heading>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Link an app to auto-log your real runs and workouts — no manual entry.
        </p>
      </div>

      {!HEALTH_SYNC_ENABLED ? (
        <Card variant="highlight" padding="lg">
          <p className="text-sm font-semibold text-text-primary">Coming soon</p>
          <p className="text-xs text-text-muted mt-1">
            Device sync isn&apos;t switched on for this build yet. Once enabled you&apos;ll be able
            to connect Strava (and your Garmin watch through it) in a couple of taps. For now, log
            your activities on the{' '}
            <Link href="/activities" className="text-accent-primary hover:underline">
              Activities
            </Link>{' '}
            screen.
          </p>
        </Card>
      ) : (
        <>
          <Card variant="hero" padding="lg">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-text-primary">Connect Strava</p>
                <p className="text-xs text-text-muted mt-0.5 max-w-sm">
                  Free, instant. Already use a Garmin, Apple Watch or Fitbit? If it syncs to Strava,
                  those runs and workouts flow into FitQuest automatically.
                </p>
              </div>
              <Button
                onClick={() => handleConnect('strava')}
                loading={connecting === 'strava'}
                loadingLabel="Opening…"
              >
                Connect Strava
              </Button>
            </div>
          </Card>

          <ConnectionList connections={connections} loading={loading} />

          <p className="text-xs text-text-muted">
            Steps and sleep don&apos;t come through Strava. Native Garmin sync (which adds those) is
            on the roadmap once Garmin approves API access; Apple Health needs a native iOS app.
          </p>
        </>
      )}
    </div>
  );
}

function ConnectionList({
  connections,
  loading,
}: {
  connections: HealthConnection[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-text-muted px-1">Loading connections…</p>;
  }
  if (connections.length === 0) {
    return (
      <Card variant="default" padding="lg" className="text-center">
        <div className="text-3xl mb-2" aria-hidden="true">
          🏅
        </div>
        <p className="text-sm font-semibold text-text-secondary">No apps linked yet</p>
        <p className="text-xs text-text-muted mt-1">
          Connect Strava above to start earning rewards from your real activity.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {connections.map((c) => {
        const { name, glyph } = providerLabel(c.provider);
        return (
          <Card key={c.id} variant="flat" padding="md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {glyph}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{name}</p>
                  <p className="text-xs text-text-muted">
                    {c.lastSyncAt
                      ? `Last sync ${new Date(c.lastSyncAt).toLocaleString()}`
                      : 'Connected'}
                  </p>
                </div>
              </div>
              <StatusPill status={c.status} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: HealthConnection['status'] }) {
  const styles: Record<HealthConnection['status'], string> = {
    connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    disconnected: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  const label = status === 'connected' ? 'Active' : status === 'error' ? 'Error' : 'Inactive';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status]}`}>
      {label}
    </span>
  );
}
