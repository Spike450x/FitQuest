'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  /** Optional close handler. When provided, escape and backdrop click trigger it. */
  onClose?: () => void;
  /** Optional accessible label. Use when there's no visible heading. */
  ariaLabel?: string;
  /** Element id of the modal heading inside `children` (sets aria-labelledby). */
  ariaLabelledby?: string;
  /** Maximum width on desktop. Defaults to `max-w-lg`. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** When false, hides the rounded white container — use for custom-styled modals. */
  bare?: boolean;
  /**
   * Animation feel. `default` is the standard subtle pop. `cinematic` uses a
   * stronger spring with overshoot — reserve it for celebratory / high-stakes
   * moments (level up, victory, achievement unlock).
   */
  feel?: 'default' | 'cinematic';
  children: ReactNode;
  className?: string;
}

const SIZE_MAX_W: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Standard FitQuest modal. Animates in with a scale+fade. Closes on backdrop
 * click and Escape when an `onClose` handler is provided. For dismissable
 * modals only — pass no `onClose` for required flows like level-up celebration.
 */
export function Modal({
  open,
  onClose,
  ariaLabel,
  ariaLabelledby,
  size = 'lg',
  bare = false,
  feel = 'default',
  children,
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Move focus into the dialog on open; restore to the trigger element on close.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            role="presentation"
            aria-hidden="true"
            onClick={onClose}
            className={`absolute inset-0 cursor-default ${
              feel === 'cinematic' ? 'bg-black/70 backdrop-blur-md' : 'bg-black/50 backdrop-blur-sm'
            }`}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            initial={
              feel === 'cinematic' ? { opacity: 0, scale: 0.8, y: 16 } : { opacity: 0, scale: 0.95 }
            }
            animate={
              feel === 'cinematic' ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1 }
            }
            exit={
              feel === 'cinematic' ? { opacity: 0, scale: 0.92, y: 8 } : { opacity: 0, scale: 0.95 }
            }
            transition={
              feel === 'cinematic'
                ? { type: 'spring', stiffness: 280, damping: 22, mass: 0.9 }
                : { duration: 0.2, ease: 'easeOut' }
            }
            className={[
              'relative w-full',
              SIZE_MAX_W[size],
              bare
                ? ''
                : 'bg-white rounded-2xl shadow-2xl border border-gray-200 dark:bg-slate-900 dark:border-slate-700 dark:shadow-black/50 dark:text-slate-100',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
