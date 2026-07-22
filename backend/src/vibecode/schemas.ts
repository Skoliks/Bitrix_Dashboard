import { z } from 'zod'

const amountSchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid amount'
    })
    return z.NEVER
  }

  return amount
})

const commonMetaSchema = z.object({
  total: z.number().optional(),
  hasMore: z.boolean().optional(),
  durationMs: z.number().optional(),
  autoWindowed: z.boolean().optional(),
  windowCount: z.number().optional(),
  batchWaves: z.number().optional()
}).passthrough()

const successResponseSchema = <T extends z.ZodType>(data: T): z.ZodObject<{
  success: z.ZodLiteral<true>
  data: T
  meta: z.ZodOptional<typeof commonMetaSchema>
}> => z.object({
  success: z.literal(true),
  data,
  meta: commonMetaSchema.optional()
})

const singleOrArray = <T extends z.ZodType>(item: T): z.ZodUnion<[T, z.ZodArray<T>]> => z.union([item, z.array(item)])

export const externalDealSchema = z.object({
  id: z.number(),
  title: z.string(),
  amount: amountSchema,
  currency: z.string().nullable(),
  categoryId: z.number(),
  stageId: z.string(),
  previousStageId: z.string().nullable().optional(),
  stageSemanticId: z.string().nullable(),
  assignedById: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable(),
  begindate: z.string().nullable().optional(),
  closed: z.boolean().optional(),
  entityTypeId: z.number().optional()
}).passthrough()

export const externalDealCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  sort: z.number(),
  isLocked: z.boolean(),
  createdAt: z.string().optional()
}).passthrough()

export const externalStageSchema = z.object({
  id: z.number(),
  entityId: z.string(),
  statusId: z.string(),
  name: z.string(),
  nameInit: z.string().optional(),
  sort: z.number(),
  system: z.boolean(),
  color: z.string().optional(),
  semantics: z.string().nullable(),
  categoryId: z.number().optional(),
  extra: z.object({
    SEMANTICS: z.string().optional(),
    COLOR: z.string().optional()
  }).passthrough().optional()
}).passthrough()

export const externalUserSchema = z.object({
  id: z.number(),
  active: z.boolean(),
  name: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  timeZone: z.string().optional(),
  userType: z.string().optional()
}).passthrough()

export const externalCurrencySchema = z.object({
  id: z.string(),
  amountCnt: z.number(),
  amount: z.number(),
  sort: z.number(),
  base: z.boolean(),
  fullName: z.string(),
  lid: z.string(),
  formatString: z.string(),
  decPoint: z.string(),
  thousandsSep: z.string().nullable(),
  decimals: z.number(),
  dateUpdate: z.string()
}).passthrough()

export const aggregateMetaSchema = z.object({
  totalRecords: z.number(),
  recordsProcessed: z.number(),
  truncated: z.boolean(),
  groupTotal: z.number().optional(),
  groupsTruncated: z.boolean().optional()
}).passthrough()

export const externalAggregateGroupSchema = z.object({
  stageId: z.string().optional(),
  stageSemanticId: z.string().optional(),
  categoryId: z.number().optional(),
  assignedById: z.number().optional(),
  sourceId: z.string().nullable().optional(),
  count: z.number(),
  aggregates: z.record(z.string(), z.unknown())
}).passthrough()

export const aggregateDataSchema = z.object({
  count: z.number(),
  aggregates: z.record(z.string(), z.unknown()),
  groups: z.array(externalAggregateGroupSchema).optional(),
  meta: aggregateMetaSchema
}).passthrough()

export const meResponseSchema = successResponseSchema(z.object({
  portal: z.string(),
  scopes: z.array(z.string()),
  api: z.object({
    entityApi: z.object({
      entities: z.record(z.string(), z.string())
    }).passthrough()
  }).passthrough()
}).passthrough())

export const guideResponseSchema = successResponseSchema(z.object({
  entityApi: z.object({
    entities: z.record(z.string(), z.string())
  }).passthrough()
}).passthrough())

export const dealsListResponseSchema = successResponseSchema(z.array(externalDealSchema))
export const dealsSearchResponseSchema = successResponseSchema(z.array(externalDealSchema))
export const dealsAggregateResponseSchema = successResponseSchema(aggregateDataSchema)
export const dealCategoriesResponseSchema = successResponseSchema(singleOrArray(externalDealCategorySchema))
export const statusesResponseSchema = successResponseSchema(z.array(externalStageSchema))
export const usersResponseSchema = successResponseSchema(singleOrArray(externalUserSchema))
export const currenciesResponseSchema = successResponseSchema(z.array(externalCurrencySchema))

export const dealsSearchFixtureSchema = z.object({
  request: z.object({
    method: z.literal('POST'),
    path: z.literal('/v1/deals/search'),
    body: z.unknown()
  }),
  response: dealsSearchResponseSchema
})

export const dealsAggregateFixtureSchema = z.object({
  request: z.object({
    method: z.literal('POST'),
    path: z.literal('/v1/deals/aggregate'),
    body: z.unknown()
  }),
  response: dealsAggregateResponseSchema
})

export const vibeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string()
  })
})

export const vibeErrorFixtureSchema = z.object({
  status: z.number(),
  body: vibeErrorResponseSchema
})

export const vibeErrorFixturesSchema = z.object({
  missingApiKey: vibeErrorFixtureSchema,
  invalidFilterOperator: vibeErrorFixtureSchema,
  invalidAggregateGroupBy: vibeErrorFixtureSchema
})

const dateFilterSchema = z.object({
  $gt: z.string().optional(),
  $gte: z.string().optional(),
  $lt: z.string().optional(),
  $lte: z.string().optional(),
  $ne: z.string().optional(),
  $contains: z.string().optional(),
  $in: z.array(z.string()).optional(),
  $nin: z.array(z.string()).optional()
}).strict()

export const dealSearchRequestBodySchema = z.object({
  filter: z.object({
    categoryId: z.number().optional(),
    stageSemanticId: z.string().optional(),
    currency: z.string().optional(),
    createdAt: dateFilterSchema.optional(),
    closedAt: dateFilterSchema.optional()
  }).strict().optional(),
  select: z.array(z.string()).optional(),
  order: z.record(z.string(), z.enum(['asc', 'desc'])).optional(),
  limit: z.number().int().positive().optional()
}).strict()

export const aggregateGroupBySchema = z.enum([
  'amount',
  'stageId',
  'stageSemanticId',
  'categoryId',
  'assignedById',
  'sourceId'
])

export const dealAggregateRequestBodySchema = z.object({
  op: z.enum(['count', 'sum', 'avg', 'min', 'max']),
  groupBy: z.array(aggregateGroupBySchema).optional(),
  filter: dealSearchRequestBodySchema.shape.filter,
  limit: z.number().int().positive().optional()
}).strict()

export type ExternalDeal = z.infer<typeof externalDealSchema>
export type ExternalDealCategory = z.infer<typeof externalDealCategorySchema>
export type ExternalStage = z.infer<typeof externalStageSchema>
export type ExternalUser = z.infer<typeof externalUserSchema>
export type ExternalCurrency = z.infer<typeof externalCurrencySchema>
export type AggregateData = z.infer<typeof aggregateDataSchema>
export type DealSearchRequestBody = z.infer<typeof dealSearchRequestBodySchema>
export type DealAggregateRequestBody = z.infer<typeof dealAggregateRequestBodySchema>
