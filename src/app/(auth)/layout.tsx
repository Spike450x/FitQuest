export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-violet-950/40 flex items-center justify-center p-4 transition-colors">
      <main id="main-content" className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-indigo-600 dark:text-indigo-300 tracking-tight">
            FitQuest
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-2">
            Turn your daily habits into epic adventures
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
