import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function proxyPlugin(): Plugin {
  const sharedBridge = readFileSync(
    resolve(__dirname, 'src/crawlers/bridge.js'),
    'utf-8'
  )

  const DOMAIN_BRIDGES: Record<string, string> = {
    'pnwchords.com': 'pnwchords.js',
    'worshiptogether.com': 'worshiptogether.js',
  }

  const domainBridgeCache: Record<string, string> = {}
  for (const [domain, filename] of Object.entries(DOMAIN_BRIDGES)) {
    const path = resolve(__dirname, 'src/crawlers', filename)
    if (existsSync(path)) {
      domainBridgeCache[domain] = readFileSync(path, 'utf-8')
    }
  }

  function getDomainBridge(hostname: string): string {
    for (const [domain, script] of Object.entries(domainBridgeCache)) {
      if (hostname.includes(domain)) return script
    }
    return ''
  }

  return {
    name: 'chords-proxy',
    configureServer(server) {
      server.middlewares.use('/__proxy', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const targetUrl = url.searchParams.get('url')

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Missing url parameter')
          return
        }

        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            redirect: 'follow',
          })
          const contentType = response.headers.get('content-type') ?? ''

          if (contentType.includes('text/html')) {
            let html = await response.text()
            const targetOrigin = new URL(targetUrl).origin
            const targetHostname = new URL(targetUrl).hostname
            const originScript = `<script>window.__chordsOriginHostname="${targetHostname}";window.__chordsOriginHref="${targetUrl}";</script>`
            const sharedTag = `<script data-chords-bridge>${sharedBridge}</script>`
            const domainBridge = getDomainBridge(targetHostname)
            const domainTag = domainBridge ? `<script data-chords-domain-bridge>${domainBridge}</script>` : ''
            const baseTag = `<base href="${targetOrigin}/">`
            html = html.replace('<head>', `<head>${baseTag}`)
            html = html.replace('</head>', `${originScript}${sharedTag}${domainTag}</head>`)
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(html)
          } else {
            const buffer = Buffer.from(await response.arrayBuffer())
            res.writeHead(response.status, {
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*',
            })
            res.end(buffer)
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end(`Proxy error: ${String(err)}`)
        }
      })
    },
  }
}

export default defineConfig({
  base: process.env.VITE_APP_BASE_PATH || '/',
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    proxyPlugin(),
  ],
  server: {
    host: true,
    port: 3000,
  },
})
