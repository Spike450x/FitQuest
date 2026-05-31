import Link from 'next/link';
import { BrandMark } from '@/components/ui/BrandMark';
import { LegalFooter } from '@/components/ui/LegalFooter';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      <header className="border-b border-gray-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl h-14 flex items-center px-6">
        <Link
          href="/dashboard"
          className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
          aria-label="FitQuest home"
        >
          <BrandMark size={28} />
        </Link>
      </header>
      <main id="main-content" className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {children}
      </main>
      <LegalFooter className="py-8" />
    </div>
  );
}
