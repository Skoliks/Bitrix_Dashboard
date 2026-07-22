import type { IncomingHttpHeaders } from 'node:http'

import { describe, expect, it } from 'vitest'

import { createWebRequest } from '../../src/http/nodeRequest.js'

describe('node request adapter', () => {
  it('does not attach a Node request stream as fetch body in the GET-only scaffold', () => {
    const request = createWebRequest({
      headers: { host: 'localhost:3000' } satisfies IncomingHttpHeaders,
      method: 'POST',
      url: '/future'
    })

    expect(request.method).toBe('POST')
    expect(request.body).toBeNull()
  })
})
