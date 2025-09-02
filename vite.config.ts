import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const base = isProduction ? '/connect1.1/' : '/';
  
  return {
  base,
  server: {
    port: 8080,
    host: '127.0.0.1',
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1'
    },
    strictPort: false
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lucide-react']
        }
      }
    }
  },
  // PWA Configuration
  define: {
    __PWA_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __PWA_BUILD_DATE__: JSON.stringify(new Date().toISOString())
  }
}
});
