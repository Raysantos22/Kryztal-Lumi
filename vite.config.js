import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // A production build without Supabase settings would silently become the
  // in-browser demo shop. Refuse unless demo mode is asked for explicitly.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && !env.VITE_SUPABASE_URL && env.VITE_DEMO_MODE !== 'true') {
    throw new Error(
      'VITE_SUPABASE_URL is not set. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, or VITE_DEMO_MODE=true for a demo build.',
    )
  }
  return {
    plugins: [react(), tailwindcss()],
    // PGlite (demo mode only) ships its own WASM; don't pre-bundle it.
    optimizeDeps: { exclude: ['@electric-sql/pglite'] },
    worker: { format: 'es' },
  }
})
