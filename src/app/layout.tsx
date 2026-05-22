import type { Metadata, Viewport } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FitQuest — Turn fitness into adventure',
  description:
    'Level up your real-life stats, fight monsters, and earn rewards for healthy habits.',
  manifest: '/manifest.webmanifest',
  applicationName: 'FitQuest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitQuest',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  // Theme color reaches the browser chrome (URL bar on Android, status bar in
  // PWA standalone). Pair light + dark so the chrome matches the active theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Lock to user-zoom only — discourages accidental pinch-zoom in the game UI
  // while still respecting accessibility (do not disable user-scalable).
  maximumScale: 5,
};

// No-flash theme bootstrap. Runs before React hydrates so the page renders
// in the user's preferred theme on the first paint (no light-mode flash).
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('fitquest-theme');
    var prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored ?? (prefers ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100 antialiased font-sans transition-colors">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
