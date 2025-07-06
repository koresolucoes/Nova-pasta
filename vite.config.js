const { defineConfig, loadEnv } = require('vite');
const react = require('@vitejs/plugin-react').default;
const path = require('path');

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env': {
        ...env,
        VITE_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || ''),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
        GEMINI_API_KEY: JSON.stringify(env.GEMINI_API_KEY || '')
      }
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: '@components', replacement: path.resolve(__dirname, 'src/components') },
        { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
        { find: '@services', replacement: path.resolve(__dirname, 'src/services') },
        { find: '@types', replacement: path.resolve(__dirname, 'src/types') },
      ]
    },
    // PostCSS configuration is handled by postcss.config.js
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            vendor: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
