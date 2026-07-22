import { describe, expect, it } from 'vitest'

import { MemoryCache } from '../../src/services/cache.js'

describe('MemoryCache', () => {
  it('keeps values isolated by portal-scoped keys and expires by ttl', () => {
    let now = 1_000
    const cache = new MemoryCache(() => now)

    cache.set('categories:portal-a', ['a'], 100)
    cache.set('categories:portal-b', ['b'], 100)

    expect(cache.get('categories:portal-a')).toEqual(['a'])
    expect(cache.get('categories:portal-b')).toEqual(['b'])

    now = 1_101
    expect(cache.get('categories:portal-a')).toBeUndefined()
    expect(cache.get('categories:portal-b')).toBeUndefined()
  })
})
