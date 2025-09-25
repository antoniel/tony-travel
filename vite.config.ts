import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    viteReact(),
    codeInspectorPlugin({
      bundler: 'vite',
      hotKeys: ['altKey']
    })
  ],
})

export default config
