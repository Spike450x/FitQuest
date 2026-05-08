export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <main id="main-content" className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 tracking-tight">FitQuest</h1>
          <p className="text-gray-500 text-sm mt-2">Turn your daily habits into epic adventures</p>
        </div>
        {children}
      </main>
    </div>
  );
}
