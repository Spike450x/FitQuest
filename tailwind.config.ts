import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // RPG dark theme palette
        stone: {
          950: "#0c0a09",
        },
        gold: {
          DEFAULT: "#f59e0b",
          light: "#fcd34d",
          dark: "#b45309",
        },
      },
      fontFamily: {
        // Use system font — swap for a fantasy font later (e.g. MedievalSharp)
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
