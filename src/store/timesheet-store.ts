'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DayEntry, MonthData, UserSettings, InterruptionType } from '@/types'
import { isHoliday, isWeekend } from '@/lib/holidays'

const STANDARD_WORK_HOURS = 8

interface TimesheetState {
  settings: UserSettings
  currentMonth: MonthData | null
  previousMonthsNV: number // Accumulated NV from previous months

  setSettings: (settings: Partial<UserSettings>) => void
  initializeMonth: (year: number, month: number) => void
  updateDayEntry: (dayOfMonth: number, updates: Partial<DayEntry>) => void
  recalculateTotals: () => void
  setPreviousMonthsNV: (hours: number) => void
}

export const useTimesheetStore = create<TimesheetState>()(
  persist(
    (set, get) => ({
      settings: {
        firstName: '',
        lastName: '',
        employeeNumber: '',
        signatureImage: undefined,
      },
      currentMonth: null,
      previousMonthsNV: 0,

      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setPreviousMonthsNV: (hours) =>
        set({ previousMonthsNV: hours }),

      initializeMonth: (year, month) => {
        const daysInMonth = new Date(year, month, 0).getDate()
        const days: DayEntry[] = []

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day)
          const holidayInfo = isHoliday(date)
          const weekend = isWeekend(date)

          days.push({
            date,
            dayOfMonth: day,
            dayOfWeek: date.getDay(),
            isWeekend: weekend,
            isHoliday: holidayInfo.isHoliday,
            holidayName: holidayInfo.name,
            interruptionType: holidayInfo.isHoliday && !weekend ? 'Sv' : '',
            workedHours: !weekend && !holidayInfo.isHoliday ? STANDARD_WORK_HOURS : 0,
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

              // If interruption type is set (not regular work), adjust worked hours
              if (updates.interruptionType !== undefined && updates.interruptionType !== '') {
                // For full day interruptions (except NV which tracks hours separately)
                if (['D', 'N', 'Oš', 'M', 'RD', 'NP', 'Sv'].includes(updates.interruptionType)) {
                  if (updates.workedHours === undefined) {
                    updated.workedHours = 0
                  }
                }
              } else if (updates.interruptionType === '' && !day.isWeekend && !day.isHoliday) {
                // Reset to standard hours if clearing interruption
                if (updates.workedHours === undefined) {
                  updated.workedHours = STANDARD_WORK_HOURS
                }
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
    }
  )
)
