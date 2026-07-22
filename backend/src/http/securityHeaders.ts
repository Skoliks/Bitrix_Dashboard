export interface SecurityHeaderConfig {
  allowedOrigins: string[]
  appPublicUrl: string
}

export const applySecurityHeaders = (headers: Headers, config: SecurityHeaderConfig): void => {
  const frameAncestors = ["'self'", ...config.allowedOrigins].join(' ')
  const connectSrc = ["'self'", config.appPublicUrl].join(' ')

  headers.set('content-security-policy', `default-src 'self'; connect-src ${connectSrc}; frame-ancestors ${frameAncestors}`)
  headers.set('referrer-policy', 'no-referrer')
  headers.set('x-content-type-options', 'nosniff')
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
}

export const applyCorsHeaders = (headers: Headers, origin: string | null, allowedOrigins: string[]): void => {
  if (!origin || !allowedOrigins.includes(origin)) {
    return
  }

  headers.set('access-control-allow-origin', origin)
  headers.set('vary', 'Origin')
  headers.set('access-control-allow-methods', 'GET,OPTIONS')
  headers.set('access-control-allow-headers', 'Content-Type,Authorization,X-Bitrix24-Domain,X-Bitrix24-User-Id')
  headers.set('access-control-max-age', '600')
}
