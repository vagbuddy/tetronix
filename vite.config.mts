// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    //open: true, // Open the browser on server start
  },
  build: {
    outDir: "build", // Specify the output directory for the build
  },
});
