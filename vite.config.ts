import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in Replit environment
const isReplit = !!process.env.REPLIT_DEV_DOMAIN;
const replitDomain = process.env.REPLIT_DEV_DOMAIN || 'localhost';

export default defineConfig({
  plugins: [
    react(),
    
    
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@db": path.resolve(__dirname, "./db"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // PERFORMANCE OPTIMIZATION: Advanced build configuration
    minify: 'esbuild', // Use esbuild for faster, efficient minification
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("wouter") || id.includes("react-hook-form")) {
              return "react-vendor";
            }
            if (id.includes("@radix-ui")) {
              return "ui-vendor";
            }
            if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
              return "chart-vendor";
            }
            if (id.includes("date-fns") || id.includes("clsx") || id.includes("tailwind-merge") || id.includes("zod")) {
              return "utils-vendor";
            }
            return "vendor";
          }
        },
      },
    },
    // Increase chunk size warning limit (we're optimizing it)
    chunkSizeWarningLimit: 1000,
    // Disable source maps for smaller production builds
    sourcemap: false,
  },
  // PERFORMANCE: Remove console logs in production via esbuild
  esbuild: {
    drop: [],
  },
  // PERFORMANCE: Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom', 
      'react-hook-form',
      'wouter',
      '@tanstack/react-query',
      'chart.js',
      'react-chartjs-2',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
});
