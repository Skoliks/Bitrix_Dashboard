import { describe, expect, it } from 'vitest'

import { mapDeal, mapDealCategories, mapUsers } from '../../src/vibecode/mappers.js'
import { externalDealSchema } from '../../src/vibecode/schemas.js'

describe('VibeCode mappers', () => {
  it('normalizes nullable fields and amount strings in deals', () => {
    const deal = mapDeal(externalDealSchema.parse({
      id: 7,
      title: 'Synthetic title',
      amount: '42.50',
      currency: null,
      categoryId: 0,
      stageId: 'NEW',
      stageSemanticId: null,
      assignedById: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
      closedAt: null
    }))

    expect(deal).toEqual({
      id: 7,
      title: 'Synthetic title',
      amount: 42.5,
      currency: null,
      categoryId: 0,
      stageId: 'NEW',
      stageSemanticId: null,
      assignedById: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
      closedAt: null
    })
  })

  it('accepts singleton or array reference data responses', () => {
    expect(mapDealCategories({ id: 1, name: 'Main', sort: 10, isLocked: false })).toHaveLength(1)
    expect(mapUsers([{ id: 2, active: true, name: 'Ada' }])).toEqual([{
      id: 2,
      active: true,
      displayName: 'Ada'
    }])
  })
})
