import type { IncomingHttpHeaders } from 'node:http'

interface NodeRequestLike {
  headers: IncomingHttpHeaders
  method?: string | undefined
  url?: string | undefined
}

export const createWebRequest = (request: NodeRequestLike, fallbackPort = 3000): Request => {
  const origin = request.headers.host ? `http://${request.headers.host}` : `http://127.0.0.1:${fallbackPort}`
  const init: RequestInit = {
    headers: request.headers as HeadersInit
  }

  if (request.method) {
    init.method = request.method
  }

  return new Request(new URL(request.url ?? '/', origin), init)
}
