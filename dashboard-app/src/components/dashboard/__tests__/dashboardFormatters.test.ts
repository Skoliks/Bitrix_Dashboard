import { describe, expect, it } from 'vitest'

import type { BootstrapResponse } from '../../../types/dashboard'
import { formatMoney } from '../dashboardFormatters'

const currency = (formatString: string): BootstrapResponse['currencies'] => [{
  id: 'RUB',
  amountCnt: 1,
  amount: 1,
  sort: 100,
  base: true,
  fullName: 'Russian ruble',
  formatString,
  decimals: 2
}]

describe('dashboard formatters', () => {
  it('decodes decimal numeric currency entities before inserting the amount', () => {
    expect(formatMoney({ currency: 'RUB', amount: 760000 }, currency('# &#8381;'))).toBe('760 000 \u20bd')
  })

  it('decodes hexadecimal numeric currency entities before inserting the amount', () => {
    const formatted = formatMoney({ currency: 'RUB', amount: 760000 }, currency('# &#x20bd;'))

    expect(formatted).toBe('760 000 \u20bd')
    expect(formatted).not.toContain('&#')
  })
})
