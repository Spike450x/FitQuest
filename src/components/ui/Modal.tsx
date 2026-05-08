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
  children,
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !onClose) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

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
          <button
            type="button"
            aria-label="Close modal backdrop"
            tabIndex={-1}
            onClick={onClose}
            disabled={!onClose}
            className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm cursor-default"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={[
              'relative w-full',
              SIZE_MAX_W[size],
              bare ? '' : 'bg-white rounded-2xl shadow-2xl border border-gray-200',
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
