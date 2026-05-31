import { BrandMark } from '@/components/ui/BrandMark';
import { LegalFooter } from '@/components/ui/LegalFooter';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-violet-950/40 flex flex-col items-center justify-center p-4 gap-6 transition-colors">
      <main id="main-content" className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="text-indigo-600 dark:text-indigo-300">
            <BrandMark size={56} />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Turn your daily habits into epic adventures
          </p>
        </div>
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}
