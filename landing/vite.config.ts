import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Fase 2: descomentar cuando la landing hable con el backend de ALFRED.
    // proxy: {
    //   "/api": "http://localhost:3000",
    // },
  },
});
