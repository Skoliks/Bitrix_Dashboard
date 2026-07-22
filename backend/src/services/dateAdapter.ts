export type DatePreset = 'last7' | 'last30' | 'last90' | 'currentMonth' | 'previousMonth' | 'custom'

export interface DateRangeInput {
  preset: DatePreset
  dateFrom?: string
  dateTo?: string
  timeZone: string
  now: Date
}

export interface ResolvedDateRange {
  dateFrom: string
  dateTo: string
  startAt: string
  endAt: string
}

interface CalendarDate {
  year: number
  month: number
  day: number
}

export const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/

export const resolveDateRange = (input: DateRangeInput): ResolvedDateRange => {
  const current = localDateParts(input.now, input.timeZone)
  const range = calendarRange(input, current)

  return {
    dateFrom: formatCalendarDate(range.from),
    dateTo: formatCalendarDate(range.to),
    startAt: zonedDateTimeToUtc(range.from, input.timeZone, 0, 0, 0, 0).toISOString(),
    endAt: zonedDateTimeToUtc(range.to, input.timeZone, 23, 59, 59, 999).toISOString()
  }
}

export const compareCalendarDates = (left: string, right: string): number =>
  dateToDayNumber(parseCalendarDate(left)) - dateToDayNumber(parseCalendarDate(right))

export const parseCalendarDate = (value: string): CalendarDate => {
  if (!calendarDatePattern.test(value)) {
    throw new Error('Invalid calendar date format')
  }

  const [yearText, monthText, dayText] = value.split('-')
  const date = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText)
  }

  const normalized = new Date(Date.UTC(date.year, date.month - 1, date.day))
  if (
    normalized.getUTCFullYear() !== date.year ||
    normalized.getUTCMonth() + 1 !== date.month ||
    normalized.getUTCDate() !== date.day
  ) {
    throw new Error('Invalid calendar date')
  }

  return date
}

const calendarRange = (input: DateRangeInput, current: CalendarDate): { from: CalendarDate; to: CalendarDate } => {
  if (input.preset === 'custom') {
    if (!input.dateFrom || !input.dateTo) {
      throw new Error('Custom range requires dateFrom and dateTo')
    }

    return {
      from: parseCalendarDate(input.dateFrom),
      to: parseCalendarDate(input.dateTo)
    }
  }

  if (input.preset === 'currentMonth') {
    return {
      from: { year: current.year, month: current.month, day: 1 },
      to: current
    }
  }

  if (input.preset === 'previousMonth') {
    const previousMonth = addMonths({ year: current.year, month: current.month, day: 1 }, -1)
    return {
      from: previousMonth,
      to: addDays({ year: current.year, month: current.month, day: 1 }, -1)
    }
  }

  const days = input.preset === 'last7' ? 7 : input.preset === 'last30' ? 30 : 90
  return {
    from: addDays(current, -(days - 1)),
    to: current
  }
}

const localDateParts = (date: Date, timeZone: string): CalendarDate => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const value = (type: string): number => Number(parts.find(part => part.type === type)?.value)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day')
  }
}

const zonedDateTimeToUtc = (
  date: CalendarDate,
  timeZone: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
): Date => {
  const utcGuess = Date.UTC(date.year, date.month - 1, date.day, hour, minute, second, millisecond)
  const firstPass = new Date(utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone))
  const offset = timeZoneOffsetMs(firstPass, timeZone)
  return new Date(utcGuess - offset)
}

const timeZoneOffsetMs = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const value = (type: string): number => Number(parts.find(part => part.type === type)?.value)
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
    date.getUTCMilliseconds()
  )

  return asUtc - date.getTime()
}

const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day))
  value.setUTCDate(value.getUTCDate() + days)
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate()
  }
}

const addMonths = (date: CalendarDate, months: number): CalendarDate => {
  const value = new Date(Date.UTC(date.year, date.month - 1, 1))
  value.setUTCMonth(value.getUTCMonth() + months)
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: 1
  }
}

const dateToDayNumber = (date: CalendarDate): number =>
  Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000)

const formatCalendarDate = (date: CalendarDate): string => {
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${date.year}-${month}-${day}`
}
