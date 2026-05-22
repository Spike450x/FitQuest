import { forwardRef } from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Controls padding and text size. Defaults to 'md'. */
  inputSize?: InputSize;
  /** Extra classes on the wrapper div (only applied when `label` is provided). */
  wrapperClassName?: string;
}

const SIZE: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5',
  lg: 'px-4 py-3 text-lg',
};

/**
 * Canonical themed input. Owns the dark-mode background, text, placeholder,
 * border, and focus-ring in one place. Pass `inputSize` for sm/md/lg variants.
 * Any extra classes via `className` should be non-conflicting (e.g. `mt-1`).
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, id, inputSize = 'md', wrapperClassName = '', className = '', ...props },
  ref,
) {
  const base = [
    'w-full bg-white dark:bg-slate-950',
    'border border-gray-300 dark:border-slate-700',
    'rounded-lg',
    SIZE[inputSize],
    'text-gray-900 dark:text-slate-100',
    'placeholder-gray-400 dark:placeholder-slate-500',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
    'transition-colors',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!label) {
    return <input ref={ref} id={id} className={base} {...props} />;
  }

  return (
    <div className={wrapperClassName}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1"
      >
        {label}
      </label>
      <input ref={ref} id={id} className={base} {...props} />
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
});
