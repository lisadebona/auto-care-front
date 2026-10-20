import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const inDocker = process.env.VITE_HOST === '0.0.0.0';

export default defineConfig({
  plugins: [react()],
  server: inDocker
    ? {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        watch: { usePolling: true, interval: 300 },
      }
    : undefined,
});
