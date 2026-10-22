import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// Next 16 removed `next lint`; run `npm run lint` (plain ESLint, flat config).
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The codebase types API rows as `any` throughout (500+ uses). Kept visible as a warning, not a build-breaking error.
      "@typescript-eslint/no-explicit-any": "warn",
      // React-19 compiler rule. Flags the page-wide "fetch on mount in useEffect" pattern (setLoading/setState inside the effect).
      // Real but not a bug here; migrate to a data-fetching layer (Batch 2) rather than rewriting 18 call sites.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "next-env.d.ts", "components/ui/**"]),
])
