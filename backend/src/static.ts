import { readFile, stat } from 'node:fs/promises'
import { extname, normalize, resolve, sep } from 'node:path'

export type StaticAssetHandler = (request: Request, headers: Headers) => Promise<Response | null>

interface StaticAssetOptions {
  root: string
}

const immutableAssetPattern = /^\/assets\//

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp']
])

export const createStaticAssetHandler = (options: StaticAssetOptions): StaticAssetHandler => {
  const root = resolve(options.root)
  const indexPath = resolve(root, 'index.html')

  return async (request, baseHeaders) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return null
    }

    const url = new URL(request.url)
    if (isBackendRoute(url.pathname)) {
      return null
    }

    const candidate = resolveStaticPath(root, url.pathname)
    if (!candidate) {
      return null
    }

    const assetPath = await existingFile(candidate) ? candidate : await fallbackPath(indexPath, url.pathname)
    if (!assetPath) {
      return null
    }

    const headers = new Headers(baseHeaders)
    headers.set('content-type', contentType(assetPath))
    headers.set('cache-control', cacheControl(url.pathname, assetPath === indexPath))

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers })
    }

    return new Response(await readFile(assetPath), { status: 200, headers })
  }
}

const isBackendRoute = (pathname: string): boolean =>
  pathname === '/health' || pathname === '/ready' || pathname === '/api' || pathname.startsWith('/api/')

const resolveStaticPath = (root: string, pathname: string): string | null => {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const normalizedPath = normalize(decoded.replace(/^\/+/, ''))
  const target = resolve(root, normalizedPath)
  return isInsideRoot(root, target) ? target : null
}

const isInsideRoot = (root: string, target: string): boolean =>
  target === root || target.startsWith(`${root}${sep}`)

const existingFile = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

const fallbackPath = async (indexPath: string, pathname: string): Promise<string | null> => {
  if (extname(pathname)) {
    return null
  }

  return await existingFile(indexPath) ? indexPath : null
}

const contentType = (path: string): string =>
  contentTypes.get(extname(path).toLowerCase()) ?? 'application/octet-stream'

const cacheControl = (pathname: string, isIndex: boolean): string =>
  isIndex || !immutableAssetPattern.test(pathname)
    ? 'no-cache'
    : 'public, max-age=31536000, immutable'
