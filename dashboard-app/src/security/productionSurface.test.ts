import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string): string => readFileSync(join(root, path), 'utf8')

describe('production frontend surface', () => {
  it('requests only MVP Bitrix24 scopes', async () => {
    const { useB24 } = await import('../composables/useB24')
    expect(useB24().getRequiredRights()).toEqual(['user_brief', 'crm'])
  })

  it('does not expose template routes from the production pages directory', () => {
    expect(existsSync(join(root, 'src/pages/customers.vue'))).toBe(false)
    expect(existsSync(join(root, 'src/pages/inbox.vue'))).toBe(false)
    expect(existsSync(join(root, 'src/pages/install.vue'))).toBe(false)
    expect(existsSync(join(root, 'src/pages/settings.vue'))).toBe(false)
    expect(existsSync(join(root, 'src/pages/settings'))).toBe(false)
  })

  it('does not keep the legacy direct CRM data path in production source', () => {
    expect(existsSync(join(root, 'src/composables/useDealStats'))).toBe(false)
    expect(read('src/pages/index.vue')).not.toContain('crm.item.list')
  })

  it('keeps non-MVP shortcuts and source links out of the default layout', () => {
    const layout = read('src/layouts/default.vue')

    expect(layout).not.toContain('/customers')
    expect(layout).not.toContain('/inbox')
    expect(layout).not.toContain('/install')
    expect(layout).not.toContain('/settings')
    expect(layout).not.toContain('View page source')
    expect(layout).not.toContain('cookie-consent')
  })
})
