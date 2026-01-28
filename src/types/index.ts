// Work interruption types according to the legend
export type InterruptionType =
  | 'Sv'  // Svátek
  | 'D'   // Dovolená
  | 'N'   // Nemocenská
  | 'Oš'  // Ošetřování člena rodiny
  | 'NV'  // Náhradní volno celý den
  | 'P'   // Překážky v práci (lékař, dárcovství krve, svatba…)
  | 'M'   // Peněžní pomoc v mateřství
  | 'RD'  // Rodičovská dovolená
  | 'NP'  // Neplacené volno
  | ''    // Regular work day

export interface DayEntry {
  date: Date
  dayOfMonth: number
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  interruptionType: InterruptionType
  workedHours: number
  overtimeHours: number
  overtimeToPayHours: number // Přesčas k proplacení (tento den)
  compensatoryLeaveHours: number // Čerpání náhradního volna
  vacationHours: number // Hodiny dovolené (pro částečnou dovolenou)
  passHours: number // Propustky
  passReason?: string
  passFrom?: string // HH:MM
  passTo?: string   // HH:MM
}

export interface MonthData {
  year: number
  month: number // 1-12
  days: DayEntry[]
  // Summary values
  totalWorkedHours: number
  totalOvertimeHours: number
  totalOvertimeToPayHours: number // Přesčas k proplacení celkem
  totalCompensatoryLeaveHours: number
  totalPassHours: number
  totalVacationDays: number
  totalVacationHours: number // Pro částečné dovolené
  totalSickDays: number
  // NV tracking
  previousMonthNV: number
  currentMonthNVUsed: number
}

export interface UserSettings {
  firstName: string
  lastName: string
  employeeNumber: string
  signatureImage?: string // Base64 encoded image
}

export interface TimesheetStore {
  // User settings
  settings: UserSettings
  setSettings: (settings: Partial<UserSettings>) => void

  // Current month data
  currentMonth: MonthData | null
  setCurrentMonth: (month: MonthData) => void

  // Actions
  initializeMonth: (year: number, month: number) => void
  updateDayEntry: (dayOfMonth: number, updates: Partial<DayEntry>) => void

  // Persistence
  loadFromStorage: () => void
  saveToStorage: () => void
}

// Czech public holidays - fixed dates
export interface Holiday {
  month: number
  day: number
  name: string
}
