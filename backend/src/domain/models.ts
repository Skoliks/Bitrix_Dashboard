export interface Deal {
  id: number
  title: string
  amount: number
  currency: string | null
  categoryId: number
  stageId: string
  stageSemanticId: string | null
  assignedById: number | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

export interface DealCategory {
  id: number
  name: string
  sort: number
  isLocked: boolean
}

export interface Stage {
  id: string
  entityId: string
  name: string
  sort: number
  color?: string
  semantic: string | null
  categoryId?: number
}

export interface User {
  id: number
  active: boolean
  displayName?: string
  timeZone?: string
}

export interface Currency {
  id: string
  amountCnt: number
  amount: number
  sort: number
  base: boolean
  fullName: string
  formatString: string
  decimals: number
}

export interface VibeCodeMeta {
  total?: number
  hasMore?: boolean
  durationMs?: number
  autoWindowed?: boolean
  windowCount?: number
  batchWaves?: number
  totalRecords?: number
  recordsProcessed?: number
  truncated?: boolean
  groupTotal?: number
  groupsTruncated?: boolean
}
