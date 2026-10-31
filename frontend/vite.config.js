import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, '/');
          if (!moduleId.includes('/node_modules/')) return undefined;
          if (moduleId.includes('/firebase/')) return 'firebase-vendor';
          if (moduleId.includes('/recharts/')) return 'charts-vendor';
          if (moduleId.includes('/react-router')) return 'router-vendor';
          if (moduleId.includes('/react-hook-form')) return 'forms-vendor';
          if (moduleId.includes('/axios/')) return 'http-vendor';
          if (moduleId.includes('/react/') || moduleId.includes('/react-dom/')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});
