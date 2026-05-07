import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /**
   * Next 16 / eslint-config-next: React Compiler uyarıları bazı yaygın kalıpları (useEffect içinde
   * fetch + setLoading, debounce sonrası state reset, ref ile ölçüm) hata sayıyor. Bu kurallar
   * projede yüzlerce false-positive üretiyor; gerçek bug’ları TypeScript + review yakalıyor.
   */
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
