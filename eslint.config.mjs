import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".velite/**",
      "next-env.d.ts"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "features", pattern: "src/features/**" },
        { type: "shared", pattern: "src/shared/**" }
      ]
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["app", "features", "shared"] },
            { from: "features", allow: ["features", "shared"] },
            { from: "shared", allow: ["shared"] }
          ]
        }
      ]
    }
  }
];

export default eslintConfig;
