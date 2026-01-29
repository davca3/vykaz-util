'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Input } from '@/components/ui/input'
import { TimeInput } from '@/components/ui/time-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkSchedule, DaySchedule } from '@/types'

const DAY_NAMES = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']

const DEFAULT_WORK_HOURS = 8
const DEFAULT_START_TIME = '6:00'

export function WorkScheduleSettings() {
  const { settings, setSettings } = useTimesheetStore()

  const workSchedule: WorkSchedule = settings.workSchedule || {
    defaultStartTime: DEFAULT_START_TIME,
    defaultHours: DEFAULT_WORK_HOURS,
    days: {
      0: { isWorkDay: false, startTime: DEFAULT_START_TIME, hours: 0 },
      1: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS },
      2: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS },
      3: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS },
      4: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS },
      5: { isWorkDay: true, startTime: DEFAULT_START_TIME, hours: DEFAULT_WORK_HOURS },
      6: { isWorkDay: false, startTime: DEFAULT_START_TIME, hours: 0 },
    }
  }

  const updateDefaultStartTime = (startTime: string) => {
    setSettings({
      workSchedule: {
        ...workSchedule,
        defaultStartTime: startTime,
      }
    })
  }

  const updateDefaultHours = (hours: number) => {
    setSettings({
      workSchedule: {
        ...workSchedule,
        defaultHours: hours,
      }
    })
  }

  const updateDaySchedule = (dayOfWeek: number, updates: Partial<DaySchedule>) => {
    const currentDay = workSchedule.days[dayOfWeek] || {
      isWorkDay: dayOfWeek !== 0 && dayOfWeek !== 6,
      startTime: workSchedule.defaultStartTime,
      hours: workSchedule.defaultHours,
    }

    setSettings({
      workSchedule: {
        ...workSchedule,
        days: {
          ...workSchedule.days,
          [dayOfWeek]: {
            ...currentDay,
            ...updates,
          }
        }
      }
    })
  }

  const applyDefaultsToAllWorkDays = () => {
    const newDays: { [key: number]: DaySchedule } = {}
    for (let i = 0; i < 7; i++) {
      const isWorkDay = workSchedule.days[i]?.isWorkDay ?? (i !== 0 && i !== 6)
      newDays[i] = {
        isWorkDay,
        startTime: workSchedule.defaultStartTime,
        hours: isWorkDay ? workSchedule.defaultHours : 0,
      }
    }
    setSettings({
      workSchedule: {
        ...workSchedule,
        days: newDays,
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Pracovní rozvrh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Default values */}
        <div className="flex items-end gap-4 p-3 bg-muted rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="defaultStartTime" className="text-xs">Začátek</Label>
            <TimeInput
              value={workSchedule.defaultStartTime}
              onChange={(value) => updateDefaultStartTime(value)}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="defaultHours" className="text-xs">Hodin/den</Label>
            <Input
              id="defaultHours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={workSchedule.defaultHours}
              onChange={(e) => updateDefaultHours(parseFloat(e.target.value) || 0)}
              className="w-16 h-8 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={applyDefaultsToAllWorkDays}
            className="text-xs text-blue-600 hover:underline pb-1"
          >
            Použít na vše
          </button>
        </div>

        {/* Per-day configuration */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-xs">
                <th className="p-2 text-left font-medium">Den</th>
                <th className="p-2 text-center font-medium">Začátek</th>
                <th className="p-2 text-center font-medium">Hodiny</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((dayOfWeek) => {
                const daySchedule = workSchedule.days[dayOfWeek] || {
                  isWorkDay: true,
                  startTime: workSchedule.defaultStartTime,
                  hours: workSchedule.defaultHours,
                }

                return (
                  <tr key={dayOfWeek} className="border-t">
                    <td className="p-2 font-medium text-sm">{DAY_NAMES[dayOfWeek]}</td>
                    <td className="p-1.5 text-center">
                      <TimeInput
                        value={daySchedule.startTime}
                        onChange={(value) =>
                          updateDaySchedule(dayOfWeek, { startTime: value })
                        }
                        className="w-full max-w-[6rem] mx-auto"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={daySchedule.hours || ''}
                        onChange={(e) =>
                          updateDaySchedule(dayOfWeek, {
                            hours: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full max-w-[4rem] h-7 text-center text-xs mx-auto"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Změny se projeví při načtení nového měsíce.
        </p>
      </CardContent>
    </Card>
  )
}
