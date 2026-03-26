import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'

const manifest = defineManifest({
  manifest_version: 3,
  name: "HuntMaster",
  version: "1.0.0",
  description: "Your trusted job hunting companion.",
  permissions: [
    "storage",
    "activeTab",
    "scripting",
    "sidePanel",
    "tabs"
  ],
  background: {
    service_worker: "src/background/index.js",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.js"]
    }
  ],
  side_panel: {
    default_path: "src/sidepanel/index.html"
  },
  options_ui: {
    page: "src/dashboard/index.html",
    open_in_tab: true
  },
  action: {
    default_title: "Open Job Tracker"
  },
  icons: {
    16: "icon.png",
    48: "icon.png",
    128: "icon.png"
  }
})

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
