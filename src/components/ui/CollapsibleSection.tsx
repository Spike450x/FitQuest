'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Card } from './Card';
import { useUiPrefsStore } from '@/store/uiPrefsStore';

interface CollapsibleSectionProps {
  /** Stable id — open/closed state is persisted per id in `uiPrefsStore`. */
  id: string;
  title: string;
  /** Optional leading glyph/icon node. */
  icon?: ReactNode;
  /** Open on first view (before the player has toggled). Defaults to true. */
  defaultOpen?: boolean;
  /** Optional content rendered on the right of the header (e.g. a "View all" link). */
  right?: ReactNode;
  children: ReactNode;
}

/**
 * Card-wrapped expand/collapse section. Keeps the long dashboard / character
 * pages scannable — especially on mobile — and remembers each section's state
 * across visits. The header is a button (keyboard + screen-reader accessible);
 * the optional `right` slot sits outside it so it can hold its own links.
 */
export function CollapsibleSection({
  id,
  title,
  icon,
  defaultOpen = true,
  right,
  children,
}: CollapsibleSectionProps) {
  const collapsedMap = useUiPrefsStore((s) => s.collapsed);
  const setCollapsed = useUiPrefsStore((s) => s.setCollapsed);
  const reduceMotion = useReducedMotion();

  const explicit = collapsedMap[id];
  const open = explicit === undefined ? defaultOpen : !explicit;
  const panelId = `section-${id}`;

  return (
    <Card variant="default" padding="lg">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed(id, open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex items-center gap-2 flex-1 min-w-0 text-left -m-1 p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}
          />
          {icon && <span className="shrink-0">{icon}</span>}
          <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider truncate">
            {title}
          </h3>
        </button>
        {right && <div className="shrink-0">{right}</div>}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="content"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
