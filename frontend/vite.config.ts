import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    svgr(),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
      host: "localhost",
    },
    cors: true,
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    include: [
      "clsx", 
      "tailwind-merge",
      "react-router-dom",
      "react-helmet-async",
      "lucide-react",
      "recharts",
      "axios",
      "zustand",
      "@tanstack/react-query"
    ],
    force: true,
  },
  build: {
    // Use terser for minification to enable console removal
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove all console.* statements in production
        drop_console: true,
        // Remove all debugger statements
        drop_debugger: true,
        // Remove pure functions (functions with no side effects)
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});
