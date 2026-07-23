import type { ProxyOptions } from 'vite'

export const DEFAULT_LOCAL_BACKEND_TARGET = 'http://127.0.0.1:3000'

export const createApiProxyConfig = (
  target: string | undefined = DEFAULT_LOCAL_BACKEND_TARGET
): Record<string, ProxyOptions> => ({
  '/api': {
    target: target.trim() || DEFAULT_LOCAL_BACKEND_TARGET,
    changeOrigin: true,
    secure: false
  }
})
