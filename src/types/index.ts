// Work interruption types according to the legend
export type InterruptionType =
  | 'Sv'  // Svátek
  | 'D'   // Dovolená
  | 'N'   // Nemocenská
  | 'NV'  // Náhradní volno celý den
  | 'P'   // Překážky v práci (lékař, dárcovství krve, svatba…)
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
  // Schedule for this specific day (can override weekly schedule)
  startTime: string // HH:MM format (e.g., "6:00")
  scheduledHours: number // Planned hours for this day
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

// Work schedule for each day of the week (0 = Sunday, 1 = Monday, etc.)
export interface DaySchedule {
  isWorkDay: boolean
  startTime: string // HH:MM format
  hours: number
}

export interface WorkSchedule {
  defaultStartTime: string // Default start time (e.g., "6:00")
  defaultHours: number // Default hours per day (e.g., 8)
  // Per-day overrides (indexed by day of week: 0=Sun, 1=Mon, ..., 6=Sat)
  days: {
    [key: number]: DaySchedule
  }
}

export interface UserSettings {
  firstName: string
  lastName: string
  employeeNumber: string
  signatureImage?: string // Base64 encoded image
  workSchedule: WorkSchedule
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
