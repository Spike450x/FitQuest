import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

// eslint-config-next is still a legacy (eslintrc-style) config as of 15.5.x,
// so it must be wrapped in FlatCompat for ESLint v9's flat config loader.
// When eslint-config-next ships native flat config support, replace the
// FlatCompat wrappers with direct imports and drop @eslint/eslintrc.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "functions/lib/**",
      "functions/node_modules/**",
      "coverage/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("prettier"),
];

export default eslintConfig;
