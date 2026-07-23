import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('local integration scripts', () => {
  it('loads backend .env during documented local dev startup', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.['dev:local']).toContain('--env-file-if-exists=.env')
  })
})
