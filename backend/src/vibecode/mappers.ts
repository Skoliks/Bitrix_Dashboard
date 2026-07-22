import type { Currency, Deal, DealCategory, Stage, User } from '../domain/models.js'
import type {
  ExternalCurrency,
  ExternalDeal,
  ExternalDealCategory,
  ExternalStage,
  ExternalUser
} from './schemas.js'

const asArray = <T>(value: T | T[]): T[] => Array.isArray(value) ? value : [value]

export const mapDeal = (deal: ExternalDeal): Deal => ({
  id: deal.id,
  title: deal.title,
  amount: deal.amount,
  currency: deal.currency,
  categoryId: deal.categoryId,
  stageId: deal.stageId,
  stageSemanticId: deal.stageSemanticId,
  assignedById: deal.assignedById,
  createdAt: deal.createdAt,
  updatedAt: deal.updatedAt,
  closedAt: deal.closedAt
})

export const mapDeals = (deals: ExternalDeal[]): Deal[] => deals.map(mapDeal)

export const mapDealCategory = (category: ExternalDealCategory): DealCategory => ({
  id: category.id,
  name: category.name,
  sort: category.sort,
  isLocked: category.isLocked
})

export const mapDealCategories = (categories: ExternalDealCategory | ExternalDealCategory[]): DealCategory[] =>
  asArray(categories).map(mapDealCategory)

export const mapStage = (stage: ExternalStage): Stage => {
  const color = stage.color ?? stage.extra?.COLOR
  return {
    id: stage.statusId,
    entityId: stage.entityId,
    name: stage.name,
    sort: stage.sort,
    ...(color ? { color } : {}),
    semantic: stage.extra?.SEMANTICS ?? stage.semantics,
    ...(stage.categoryId !== undefined ? { categoryId: stage.categoryId } : {})
  }
}

export const mapStages = (stages: ExternalStage[]): Stage[] => stages.map(mapStage)

export const mapUser = (user: ExternalUser): User => {
  const displayName = [user.name, user.lastName].filter(Boolean).join(' ').trim()
  return {
    id: user.id,
    active: user.active,
    ...(displayName ? { displayName } : {}),
    ...(user.timeZone ? { timeZone: user.timeZone } : {})
  }
}

export const mapUsers = (users: ExternalUser | ExternalUser[]): User[] => asArray(users).map(mapUser)

export const mapCurrency = (currency: ExternalCurrency): Currency => ({
  id: currency.id,
  amountCnt: currency.amountCnt,
  amount: currency.amount,
  sort: currency.sort,
  base: currency.base,
  fullName: currency.fullName,
  formatString: currency.formatString,
  decimals: currency.decimals
})

export const mapCurrencies = (currencies: ExternalCurrency[]): Currency[] => currencies.map(mapCurrency)
