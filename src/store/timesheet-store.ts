'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DayEntry, MonthData, UserSettings, InterruptionType, WorkSchedule } from '@/types'
import { isHoliday, isWeekend } from '@/lib/holidays'

const DEFAULT_WORK_HOURS = 8
const DEFAULT_START_TIME = '6:00'

// Default work schedule: Mon-Fri 8 hours starting at 6:00
const defaultWorkSchedule: WorkSchedule = {
  defaultStartTime: DEFAULT_START_TIME,
  defaultHours: DEFAULT_WORK_HOURS,
  days: {
    0: { isWorkDay: false, startTime: DEFAULT_START_TIME, hours: 0 }, // Sunday
    1: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS }, // Monday
    2: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS }, // Tuesday
    3: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS }, // Wednesday
    4: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS }, // Thursday
    5: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS }, // Friday
    6: { isWorkDay: false, startTime: DEFAULT_START_TIME, hours: 0 }, // Saturday
  }
}

interface TimesheetState {
  settings: UserSettings
  currentMonth: MonthData | null
  previousMonthsNV: number // Accumulated NV from previous months

  setSettings: (settings: Partial<UserSettings>) => void
  initializeMonth: (year: number, month: number) => void
  updateDayEntry: (dayOfMonth: number, updates: Partial<DayEntry>) => void
  recalculateTotals: () => void
  setPreviousMonthsNV: (hours: number) => void
  getScheduleForDay: (dayOfWeek: number) => { hours: number; startTime: string; isWorkDay: boolean }
}

export const useTimesheetStore = create<TimesheetState>()(
  persist(
    (set, get) => ({
      settings: {
        firstName: '',
        lastName: '',
        employeeNumber: '',
        signatureImage: undefined,
        workSchedule: defaultWorkSchedule,
      },
      currentMonth: null,
      previousMonthsNV: 0,

      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setPreviousMonthsNV: (hours) =>
        set({ previousMonthsNV: hours }),

      getScheduleForDay: (dayOfWeek: number) => {
        const schedule = get().settings.workSchedule || defaultWorkSchedule
        const daySchedule = schedule.days[dayOfWeek]
        if (daySchedule) {
          return {
            hours: daySchedule.hours,
            startTime: daySchedule.startTime,
            isWorkDay: daySchedule.isWorkDay
          }
        }
        return {
          hours: schedule.defaultHours,
          startTime: schedule.defaultStartTime,
          isWorkDay: dayOfWeek !== 0 && dayOfWeek !== 6
        }
      },

      initializeMonth: (year, month) => {
        const daysInMonth = new Date(year, month, 0).getDate()
        const days: DayEntry[] = []
        const { getScheduleForDay } = get()

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day)
          const holidayInfo = isHoliday(date)
          const weekend = isWeekend(date)
          const dayOfWeek = date.getDay()
          const schedule = getScheduleForDay(dayOfWeek)

          const isWorkingDay = schedule.isWorkDay && !weekend && !holidayInfo.isHoliday

          days.push({
            date,
            dayOfMonth: day,
            dayOfWeek,
            isWeekend: weekend,
            isHoliday: holidayInfo.isHoliday,
            holidayName: holidayInfo.name,
            interruptionType: holidayInfo.isHoliday && !weekend ? 'Sv' : '',
            startTime: schedule.startTime,
            scheduledHours: schedule.hours,
            workedHours: isWorkingDay ? schedule.hours : 0,
            overtimeHours: 0,
            overtimeToPayHours: 0,
            compensatoryLeaveHours: 0,
            vacationHours: 0,
            passHours: 0,
            passReason: undefined,
            passFrom: undefined,
            passTo: undefined,
          })
        }

        const monthData: MonthData = {
          year,
          month,
          days,
          totalWorkedHours: 0,
          totalOvertimeHours: 0,
          totalOvertimeToPayHours: 0,
          totalCompensatoryLeaveHours: 0,
          totalPassHours: 0,
          totalVacationDays: 0,
          totalVacationHours: 0,
          totalSickDays: 0,
          previousMonthNV: get().previousMonthsNV,
          currentMonthNVUsed: 0,
        }

        set({ currentMonth: monthData })
        get().recalculateTotals()
      },

      updateDayEntry: (dayOfMonth, updates) => {
        set((state) => {
          if (!state.currentMonth) return state

          const days = state.currentMonth.days.map((day) => {
            if (day.dayOfMonth === dayOfMonth) {
              const updated = { ...day, ...updates }
              // Use day's scheduledHours (can be overridden per day)
              const standardHours = updates.scheduledHours ?? updated.scheduledHours

              // If interruption type is set (not regular work), adjust worked hours
              if (updates.interruptionType !== undefined && updates.interruptionType !== '') {
                // For full day interruptions (except NV which tracks hours separately)
                if (['D', 'N', 'Oš', 'M', 'RD', 'NP', 'Sv'].includes(updates.interruptionType)) {
                  if (updates.workedHours === undefined) {
                    updated.workedHours = 0
                  }
                }
                // Pre-fill vacation hours when selecting vacation (scheduledHours - workedHours)
                if (updates.interruptionType === 'D' && updates.vacationHours === undefined) {
                  updated.vacationHours = Math.max(0, standardHours - updated.workedHours)
                }
              } else if (updates.interruptionType === '' && !day.isWeekend && !day.isHoliday) {
                // Reset to standard hours if clearing interruption
                if (updates.workedHours === undefined) {
                  updated.workedHours = standardHours
                }
                // Reset vacation hours when clearing interruption
                updated.vacationHours = 0
              }

              // Reset vacation hours when changing from vacation to another type
              if (updates.interruptionType !== undefined && updates.interruptionType !== 'D' && day.interruptionType === 'D') {
                updated.vacationHours = 0
              }

              // Auto-recalculate vacation hours when worked hours change during vacation
              if (updated.interruptionType === 'D' && updates.workedHours !== undefined && updates.vacationHours === undefined) {
                updated.vacationHours = Math.max(0, standardHours - updated.workedHours)
              }

              // Auto-calculate overtime: hours over scheduled are overtime
              const totalHours = updates.workedHours ?? updated.workedHours
              updated.overtimeHours = Math.max(0, totalHours - standardHours)

              // Ensure overtimeToPayHours doesn't exceed overtimeHours
              if (updated.overtimeToPayHours > updated.overtimeHours) {
                updated.overtimeToPayHours = updated.overtimeHours
              }

              return updated
            }
            return day
          })

          return {
            currentMonth: { ...state.currentMonth, days },
          }
        })

        get().recalculateTotals()
      },

      recalculateTotals: () => {
        set((state) => {
          if (!state.currentMonth) return state

          let totalWorkedHours = 0
          let totalOvertimeHours = 0
          let totalOvertimeToPayHours = 0
          let totalCompensatoryLeaveHours = 0
          let totalPassHours = 0
          let totalVacationDays = 0
          let totalVacationHours = 0
          let totalSickDays = 0

          for (const day of state.currentMonth.days) {
            totalWorkedHours += day.workedHours
            totalOvertimeHours += day.overtimeHours
            totalOvertimeToPayHours += day.overtimeToPayHours
            totalCompensatoryLeaveHours += day.compensatoryLeaveHours
            totalPassHours += day.passHours
            totalVacationHours += day.vacationHours

            if (day.interruptionType === 'D') totalVacationDays++
            if (day.interruptionType === 'N') totalSickDays++
          }

          return {
            currentMonth: {
              ...state.currentMonth,
              totalWorkedHours,
              totalOvertimeHours,
              totalOvertimeToPayHours,
              totalCompensatoryLeaveHours,
              totalPassHours,
              totalVacationDays,
              totalVacationHours,
              totalSickDays,
              currentMonthNVUsed: totalCompensatoryLeaveHours,
            },
          }
        })
      },
    }),
    {
      name: 'vykaz-storage',
      partialize: (state) => ({
        settings: state.settings,
        previousMonthsNV: state.previousMonthsNV,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TimesheetState>
        return {
          ...currentState,
          previousMonthsNV: persisted.previousMonthsNV ?? currentState.previousMonthsNV,
          settings: {
            ...currentState.settings,
            ...persisted.settings,
            // Deep merge workSchedule
            workSchedule: {
              ...currentState.settings.workSchedule,
              ...persisted.settings?.workSchedule,
              days: {
                ...currentState.settings.workSchedule.days,
                ...persisted.settings?.workSchedule?.days,
              },
            },
          },
        }
      },
    }
  )
)
