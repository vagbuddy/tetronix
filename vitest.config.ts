import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      "**/node_modules/**",
      "build/**",
      "dist/**",
      // exclude CRA scaffold test that requires full DnD + i18n setup
      "src/App.test.tsx",
    ],
  },
});
