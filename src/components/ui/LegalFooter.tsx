import Link from 'next/link';

interface LegalFooterProps {
  className?: string;
}

export function LegalFooter({ className = '' }: LegalFooterProps) {
  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-slate-600 ${className}`}
    >
      <span>© {new Date().getFullYear()} Josh Wood</span>
      <span aria-hidden="true">·</span>
      <Link
        href="/privacy"
        className="hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
      >
        Privacy Policy
      </Link>
      <span aria-hidden="true">·</span>
      <Link
        href="/terms"
        className="hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
      >
        Terms of Use
      </Link>
    </footer>
  );
}
