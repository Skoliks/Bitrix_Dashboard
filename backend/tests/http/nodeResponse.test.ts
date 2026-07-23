import { describe, expect, it } from 'vitest'

import { writeWebResponse } from '../../src/http/nodeResponse.js'

describe('node response adapter', () => {
  it('writes binary web response bodies without text transcoding', async () => {
    const source = Uint8Array.from([0, 255, 216, 255, 17, 128, 64, 10])
    const chunks: Buffer[] = []
    const nodeResponse = {
      writeHead(status: number, headers: Record<string, string>) {
        expect(status).toBe(200)
        expect(headers['content-type']).toBe('image/jpeg')
      },
      end(chunk: Buffer) {
        chunks.push(chunk)
      }
    }

    await writeWebResponse(new Response(source, {
      status: 200,
      headers: { 'content-type': 'image/jpeg' }
    }), nodeResponse)

    expect(Buffer.concat(chunks)).toEqual(Buffer.from(source))
  })
})
