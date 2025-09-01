import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dns from "node:dns";

// Configura DNS para resolver problemas de localhost
dns.setDefaultResultOrder('verbatim');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Detecta o ambiente de deploy
  const isVercel = process.env.VERCEL === '1';
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
  
  // Configura base path baseado no ambiente
  let basePath = '/';
  if (isGitHubPages) {
    basePath = '/connect1.1/';
  }
  
  return {
  base: basePath,
  server: {
    port: 5173,
    host: 'localhost',
    hmr: {
      port: 24679,
      host: 'localhost'
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
