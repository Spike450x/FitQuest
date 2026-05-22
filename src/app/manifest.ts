import type { MetadataRoute } from 'next';

/**
 * Web App Manifest. Served at `/manifest.webmanifest` by Next.js and lets the
 * browser treat FitQuest as an installable PWA (home-screen icon, splash,
 * stand-alone window without browser chrome).
 *
 * Icon strategy:
 * - `any` purpose icons render inside the OS's own rounded-rect frame (iOS
 *   already adds its own corner radius; the icon itself has a 96px radius).
 * - `maskable` icons have content scaled to the central 80% so Android's
 *   adaptive-icon mask doesn't clip the sword.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitQuest — Fitness RPG',
    short_name: 'FitQuest',
    description: 'Turn fitness into adventure. Level up, fight monsters, earn loot.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    categories: ['fitness', 'health', 'games', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
