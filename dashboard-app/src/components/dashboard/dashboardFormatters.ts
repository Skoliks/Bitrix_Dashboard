import type { BootstrapResponse, MoneyAmount } from '../../types/dashboard'

export const formatMoneyList = (
  amounts: MoneyAmount[],
  currencies: BootstrapResponse['currencies']
): string[] => amounts.map(amount => formatMoney(amount, currencies))

export const formatMoney = (
  amount: MoneyAmount,
  currencies: BootstrapResponse['currencies']
): string => {
  const currency = currencies.find(item => item.id === amount.currency)
  const value = formatAmount(amount.amount)
  if (!currency) {
    return `${value} ${amount.currency}`
  }

  if (currency.formatString.includes('#')) {
    return currency.formatString.replace('#', value).trim()
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
