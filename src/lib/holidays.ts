import { Holiday } from '@/types'

// Czech public holidays
export const CZECH_HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: 'Nový rok' },
  { month: 5, day: 1, name: 'Svátek práce' },
  { month: 5, day: 8, name: 'Den vítězství' },
  { month: 7, day: 5, name: 'Den slovanských věrozvěstů Cyrila a Metoděje' },
  { month: 7, day: 6, name: 'Den upálení mistra Jana Husa' },
  { month: 9, day: 28, name: 'Den české státnosti' },
  { month: 10, day: 28, name: 'Den vzniku samostatného československého státu' },
  { month: 11, day: 17, name: 'Den boje za svobodu a demokracii' },
  { month: 12, day: 24, name: 'Štědrý den' },
  { month: 12, day: 25, name: '1. svátek vánoční' },
  { month: 12, day: 26, name: '2. svátek vánoční' },
]

// Easter is movable - we need to calculate it
function getEasterDate(year: number): Date {
  // Meeus/Jones/Butcher algorithm for Easter
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function getEasterHolidays(year: number): { goodFriday: Date; easterMonday: Date } {
  const easter = getEasterDate(year)
  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2)
  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1)
  return { goodFriday, easterMonday }
}

export function isHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()

  // Check fixed holidays
  const fixedHoliday = CZECH_HOLIDAYS.find(h => h.month === month && h.day === day)
  if (fixedHoliday) {
    return { isHoliday: true, name: fixedHoliday.name }
  }

  // Check Easter holidays
  const { goodFriday, easterMonday } = getEasterHolidays(year)

  if (date.getTime() === goodFriday.getTime() ||
      (date.getDate() === goodFriday.getDate() &&
       date.getMonth() === goodFriday.getMonth() &&
       date.getFullYear() === goodFriday.getFullYear())) {
    return { isHoliday: true, name: 'Velký pátek' }
  }

  if (date.getTime() === easterMonday.getTime() ||
      (date.getDate() === easterMonday.getDate() &&
       date.getMonth() === easterMonday.getMonth() &&
       date.getFullYear() === easterMonday.getFullYear())) {
    return { isHoliday: true, name: 'Velikonoční pondělí' }
  }

  return { isHoliday: false }
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let workingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (!isWeekend(date) && !isHoliday(date).isHoliday) {
      workingDays++
    }
  }

  return workingDays
}

export function getHolidaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let holidays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (!isWeekend(date) && isHoliday(date).isHoliday) {
      holidays++
    }
  }

  return holidays
}
