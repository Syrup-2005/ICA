import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// Netlify sets URL (the site's main address) during builds. Used for absolute link-preview URLs;
// empty locally, which leaves a relative path.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const siteUrl = (env.URL ?? '').replace(/\/$/, '')

const siteUrlPlugin: Plugin = {
  name: 'ica-site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin],
  // Single source of truth for the version shown in the footer.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
