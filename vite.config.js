import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'

export default defineConfig((configEnv = {}) => {
  const mode = configEnv.mode || 'development'
  const command = configEnv.command || 'serve'
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = command === 'serve'
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID || ''
  
  // Manifest V3 CSP policy - script-src must be 'self' only. Remote code in script-src is strictly prohibited.
  const cspPolicy = isDev 
    ? "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' http://localhost:5173; img-src 'self' data: http://localhost:5173 https:; connect-src 'self' http://localhost:5173 https://localhost:5173 ws://localhost:5173 wss://localhost:5173 https://*.firebase.com https://*.firebaseio.com https://*.identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://huntmaster-31b78.firebaseapp.com https://*.firebaseapp.com https://*.googleapis.com; frame-src 'self' https://huntmaster-31b78.firebaseapp.com https://*.firebaseapp.com https://accounts.google.com https://identitytoolkit.googleapis.com;"
    : "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.firebase.com https://*.firebaseio.com https://*.identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://huntmaster-31b78.firebaseapp.com https://*.firebaseapp.com https://*.googleapis.com; frame-src 'self' https://huntmaster-31b78.firebaseapp.com https://*.firebaseapp.com https://accounts.google.com https://identitytoolkit.googleapis.com;";

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
      "tabs",
      "identity"
    ],
    ...(googleClientId ? {
      oauth2: {
        client_id: googleClientId,
        scopes: [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile"
        ]
      }
    } : {}),
    content_security_policy: {
      extension_pages: cspPolicy
    },
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

  return {
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
  }
})
