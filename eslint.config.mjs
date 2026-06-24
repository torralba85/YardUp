import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".claude/**",
      ".codex/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      "test-results/**",
      "playwright-report/**",
      "qa-artifacts/**",
      "coverage/**",
      "functions/**",
      "scripts/**",
      "dist/**",
    ],
  },
];

export default eslintConfig;
