import type { BootstrapResponse, MoneyAmount } from '../../types/dashboard'

export const formatMoneyList = (
  amounts: MoneyAmount[],
  currencies: BootstrapResponse['currencies']
): string[] => amounts.map(amount => formatMoney(amount, currencies))

export const formatMoney = (
  amount: MoneyAmount,
  currencies: BootstrapResponse['currencies']
): string => formatMoneyValue(amount, currencies, formatAmount(amount.amount))

export const formatCompactMoneyList = (
  amounts: MoneyAmount[],
  currencies: BootstrapResponse['currencies']
): string => amounts.map(amount => formatMoneyValue(amount, currencies, formatCompactAmount(amount.amount))).join(' · ')

const formatMoneyValue = (
  amount: MoneyAmount,
  currencies: BootstrapResponse['currencies'],
  value: string
): string => {
  const currency = currencies.find(item => item.id === amount.currency)
  if (!currency) {
    return `${value} ${amount.currency}`
  }

  const formatString = decodeCurrencyFormat(currency.formatString)
  if (formatString.includes('#')) {
    return formatString.replace('#', value).trim()
  }
  return `${value} ${currency.id}`
}

export const formatCount = (value: number): string => formatAmount(value)

export const formatDate = (value: string): string => new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(`${value}T00:00:00`))

export const formatDateTime = (value: string): string => new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

export const firstMoneyOrZero = (
  amounts: MoneyAmount[],
  currencies: BootstrapResponse['currencies']
): string => amounts[0] ? formatMoney(amounts[0], currencies) : '0'

const formatAmount = (value: number): string => {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(2)
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const formatCompactAmount = (value: number): string => {
  const units = [
    { threshold: 1_000_000_000, label: 'млрд' },
    { threshold: 1_000_000, label: 'млн' },
    { threshold: 1_000, label: 'тыс.' }
  ]
  const unit = units.find(candidate => Math.abs(value) >= candidate.threshold)
  if (!unit) return formatAmount(value)

  const compactValue = Math.round((value / unit.threshold) * 10) / 10
  return `${compactValue.toString().replace(/\.0$/, '')} ${unit.label}`
}

const decodeCurrencyFormat = (value: string): string => value.replace(
  /&#(x[0-9a-f]+|\d+);/gi,
  (entity, numericValue: string) => {
    const isHex = numericValue[0]?.toLowerCase() === 'x'
    const codePoint = Number.parseInt(isHex ? numericValue.slice(1) : numericValue, isHex ? 16 : 10)
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity
  }
)
