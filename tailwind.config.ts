import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Existing tokens — kept for backwards compatibility ──
        gold: {
          DEFAULT: '#f59e0b',
          light: '#fcd34d',
          dark: '#b45309',
        },

        // ── Semantic tokens (CSS-variable backed; theme-swap automatically) ──
        // Surfaces — page + card backgrounds
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-muted': 'var(--surface-muted)',
        'surface-inverse': 'var(--surface-inverse)',

        // Borders — three weights for hierarchy
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',

        // Typography — five weights, brightest to faintest
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        'text-disabled': 'var(--text-disabled)',

        // Brand accents (indigo / violet)
        'accent-primary': 'var(--accent-primary)',
        'accent-primary-hover': 'var(--accent-primary-hover)',
        'accent-secondary': 'var(--accent-secondary)',
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['var(--font-cinzel)', 'Cinzel', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      borderRadius: {
        // Pre-set radii used widely. `card` matches the default surface radius;
        // `cinematic` is the larger 2xl reserved for hero modals & banners.
        card: '0.75rem', // xl
        cinematic: '1rem', // 2xl
      },
      boxShadow: {
        // Default card surface — subtle elevation that survives dark mode.
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        elevated: '0 10px 30px -8px rgb(0 0 0 / 0.20), 0 4px 12px -4px rgb(0 0 0 / 0.10)',

        // Rarity glows — match RARITY_CARD.glow but expressed as named tokens
        // so future rarity-flavored components can opt in without rewriting
        // the underlying shadow recipe.
        'glow-uncommon': '0 0 0 1px rgb(34 197 94 / 0.20), 0 4px 16px -2px rgb(34 197 94 / 0.25)',
        'glow-rare': '0 0 0 1px rgb(59 130 246 / 0.25), 0 6px 20px -4px rgb(59 130 246 / 0.30)',
        'glow-epic': '0 0 0 1px rgb(168 85 247 / 0.30), 0 8px 24px -4px rgb(168 85 247 / 0.40)',
        'glow-legendary':
          '0 0 0 1px rgb(249 115 22 / 0.40), 0 12px 32px -4px rgb(249 115 22 / 0.50)',
      },
    },
  },
  plugins: [],
};

export default config;
