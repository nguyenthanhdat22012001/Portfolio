import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

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
      ".lighthouseci/**",
      "e2e/fixtures/**",
      "next-env.d.ts"
    ]
  },
  ...nextVitals,
  ...nextTypescript,
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
