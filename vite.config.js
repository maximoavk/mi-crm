import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Íconos como componentes React: import X from "~icons/icon-park-solid/nombre-icono"
    Icons({ compiler: 'jsx', jsx: 'react' }),
  ],
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
})
