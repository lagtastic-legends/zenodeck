import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Sanitize nextCoreWebVitals:
// 1. Remove internal ignores objects to prevent overriding global root ignores.
// 2. Remove memory-leaking 'import/resolver' (which recursively parses all node_modules/ASTs).
// 3. Fix React version detection to static string to avoid disk I/O on every file.
const sanitizedCoreWebVitals = nextCoreWebVitals
  .filter((c) => !c.ignores)
  .map((c) => {
    if (c.settings) {
      const settings = { ...c.settings, react: { version: "19.0.0" } };
      delete settings["import/resolver"];
      delete settings["import/parsers"];
      return { ...c, settings };
    }
    return c;
  });

const sanitizedTypescript = nextTypescript.filter((c) => !c.ignores);

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "**/out/**",
      "build/**",
      "**/build/**",
      "dist/**",
      "**/dist/**",
      "android/**",
      "**/android/**",
      ".git/**",
      "**/.git/**",
      "coverage/**",
      "**/coverage/**",
      "scripts/**",
      "**/scripts/**",
      "examples/**",
      "**/examples/**",
      "skills/**",
      "**/skills/**",
      "public/**",
      "**/public/**",
      "mini-services/**",
      "**/mini-services/**",
      "scratch/**",
      "**/scratch/**",
      "download/**",
      "**/download/**",
      "temp_test/**",
      "**/temp_test/**",
      "test_dl_temp/**",
      "**/test_dl_temp/**",
      "tests/**",
      "**/tests/**",
      "stitch_mobile_navigation_component_suite (1)/**",
      "**/stitch_mobile_navigation_component_suite (1)/**",
      "apks/**",
      "**/apks/**",
      "assets/**",
      "**/assets/**",
      ".agents/**",
      "**/.agents/**",
      ".zscripts/**",
      "**/.zscripts/**",
      "next-env.d.ts",
      "*.d.ts",
      "*.config.*",
    ],
  },
  ...sanitizedCoreWebVitals,
  ...sanitizedTypescript,
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-disable-directive": "off",

      // React Compiler & heavy analysis rules (causes 4GB OOM in large projects)
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/immutability": "off",
      "react-hooks/globals": "off",
      "react-hooks/refs": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/config": "off",
      "react-hooks/gating": "off",
      "react-compiler/react-compiler": "off",

      // Standard React rules
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",

      // Next.js & A11y rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "jsx-a11y/alt-text": "off",
      "import/no-anonymous-default-export": "off",

      // General JavaScript rules
      "prefer-const": "off",
      "no-unused-vars": "off",
      "no-console": "off",
      "no-debugger": "off",
      "no-empty": "off",
      "no-irregular-whitespace": "off",
      "no-case-declarations": "off",
      "no-fallthrough": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unreachable": "off",
      "no-useless-escape": "off",
    },
  },
];

export default eslintConfig;
