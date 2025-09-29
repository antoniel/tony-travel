import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const config = defineConfig({
  server: {
    proxy: {
      "/tony-ta-de-olho": {
        target: "https://us.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tony-ta-de-olho/, ""),
      },
    }
  },
  plugins: [
    // this is the plugin that enables path aliases
    codeInspectorPlugin({
      bundler: 'vite',
      hotKeys: ['altKey'],
      editor: 'cursor',
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
})

export default config
