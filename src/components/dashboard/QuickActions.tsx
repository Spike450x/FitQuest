'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Check, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useUiPrefsStore } from '@/store/uiPrefsStore';
import {
  QUICK_ACTION_CATALOG,
  MAX_PINNED_ACTIONS,
  MIN_PINNED_ACTIONS,
  resolvePinnedActions,
} from '@/lib/quickActions';

/**
 * Dashboard Quick-Action grid. The player pins which destinations appear (and in
 * what order) via the customizer; preferences persist per-device in
 * `uiPrefsStore`. Falls back to the four classic actions when nothing is pinned.
 */
export function QuickActions() {
  const pinned = useUiPrefsStore((s) => s.pinnedActions);
  const [editing, setEditing] = useState(false);
  const actions = resolvePinnedActions(pinned);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Quick Actions
        </h3>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map(({ id, href, label, desc, Icon }) => (
          <Link
            key={id}
            href={href}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02] rounded-xl p-4 text-center transition-all duration-200 group"
          >
            <div className="flex justify-center mb-2 text-indigo-500 dark:text-indigo-400 transition-transform group-hover:scale-110">
              <Icon className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
              {label}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      <QuickActionsCustomizer open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function QuickActionsCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pinned = useUiPrefsStore((s) => s.pinnedActions);
  const togglePinnedAction = useUiPrefsStore((s) => s.togglePinnedAction);
  const resetPinnedActions = useUiPrefsStore((s) => s.resetPinnedActions);

  const atMax = pinned.length >= MAX_PINNED_ACTIONS;
  const atMin = pinned.length <= MIN_PINNED_ACTIONS;

  return (
    <Modal open={open} onClose={onClose} ariaLabelledby="qa-customizer-title" size="md">
      <div className="space-y-4">
        <div>
          <h2
            id="qa-customizer-title"
            className="font-display text-lg font-bold text-gray-900 dark:text-slate-100"
          >
            Customize Quick Actions
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Pin {MIN_PINNED_ACTIONS}–{MAX_PINNED_ACTIONS} shortcuts. Tap to toggle; they appear in
            the order you add them.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_ACTION_CATALOG.map(({ id, label, desc, Icon }) => {
            const isPinned = pinned.includes(id);
            const disabled = (isPinned && atMin) || (!isPinned && atMax);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePinnedAction(id)}
                disabled={disabled}
                aria-pressed={isPinned}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  isPinned
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isPinned
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
                    {label}
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-slate-500 truncate">
                    {desc}
                  </span>
                </span>
                {isPinned && (
                  <Check className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={resetPinnedActions}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
