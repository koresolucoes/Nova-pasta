const { defineConfig, loadEnv } = require('vite');
const react = require('@vitejs/plugin-react').default;
const path = require('path');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Only expose specific environment variables to the client
  const envWithProcessPrefix = {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
  };

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
    define: envWithProcessPrefix,
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
