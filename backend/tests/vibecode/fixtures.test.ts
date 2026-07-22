import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  currenciesResponseSchema,
  dealsAggregateFixtureSchema,
  dealCategoriesResponseSchema,
  dealsListResponseSchema,
  dealsSearchFixtureSchema,
  guideResponseSchema,
  meResponseSchema,
  vibeErrorFixturesSchema,
  statusesResponseSchema,
  usersResponseSchema
} from '../../src/vibecode/schemas.js'
import {
  mapCurrencies,
  mapDealCategories,
  mapDeals,
  mapStages,
  mapUsers
} from '../../src/vibecode/mappers.js'

const fixture = (name: string): unknown => JSON.parse(
  readFileSync(resolve('..', 'docs', 'fixtures', 'vibecode', name), 'utf8')
)

describe('VibeCode fixture contracts', () => {
  it('parses every Phase 0 redacted fixture with endpoint schemas', () => {
    expect(meResponseSchema.parse(fixture('me.redacted.json')).success).toBe(true)
    expect(guideResponseSchema.parse(fixture('guide.redacted.json')).success).toBe(true)
    expect(dealsListResponseSchema.parse(fixture('deals.redacted.json')).data).toHaveLength(2)
    expect(dealsSearchFixtureSchema.parse(fixture('deals-search.redacted.json')).response.data).toHaveLength(1)
    expect(dealsAggregateFixtureSchema.parse(fixture('deals-aggregate.redacted.json')).response.data.meta.truncated).toBe(false)
    expect(dealCategoriesResponseSchema.parse(fixture('deal-categories.redacted.json')).success).toBe(true)
    expect(statusesResponseSchema.parse(fixture('statuses.redacted.json')).data).toHaveLength(2)
    expect(usersResponseSchema.parse(fixture('users.redacted.json')).success).toBe(true)
    expect(currenciesResponseSchema.parse(fixture('currencies.redacted.json')).data).toHaveLength(2)
    expect(Object.keys(vibeErrorFixturesSchema.parse(fixture('errors.redacted.json')))).toEqual([
      'missingApiKey',
      'invalidFilterOperator',
      'invalidAggregateGroupBy'
    ])
  })

  it('maps fixture data to stable internal DTOs without exposing user email', () => {
    const deals = mapDeals(dealsListResponseSchema.parse(fixture('deals.redacted.json')).data)
    const categories = mapDealCategories(dealCategoriesResponseSchema.parse(fixture('deal-categories.redacted.json')).data)
    const stages = mapStages(statusesResponseSchema.parse(fixture('statuses.redacted.json')).data)
    const users = mapUsers(usersResponseSchema.parse(fixture('users.redacted.json')).data)
    const currencies = mapCurrencies(currenciesResponseSchema.parse(fixture('currencies.redacted.json')).data)

    expect(deals[0]).toMatchObject({
      id: 2,
      amount: 0,
      currency: 'RUB',
      stageSemanticId: 'F',
      assignedById: 1
    })
    expect(categories).toHaveLength(1)
    expect(stages[0]).toMatchObject({ id: 'NEW', semantic: 'process' })
    expect(users[0]).toEqual({
      id: 1,
      active: true,
      displayName: '[REDACTED_USER_NAME] [REDACTED_USER_LAST_NAME]',
      timeZone: 'Asia/Yakutsk'
    })
    expect(JSON.stringify(users)).not.toContain('[REDACTED_EMAIL]')
    expect(currencies[0]).toMatchObject({ id: 'RUB', base: true, decimals: 2 })
  })
})
