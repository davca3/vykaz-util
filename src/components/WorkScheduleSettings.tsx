'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
      <CardHeader>
        <CardTitle>Pracovní rozvrh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default values */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="defaultStartTime">Výchozí začátek</Label>
            <Input
              id="defaultStartTime"
              value={workSchedule.defaultStartTime}
              onChange={(e) => updateDefaultStartTime(e.target.value)}
              placeholder="6:00"
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultHours">Výchozí hodiny/den</Label>
            <Input
              id="defaultHours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={workSchedule.defaultHours}
              onChange={(e) => updateDefaultHours(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={applyDefaultsToAllWorkDays}
          className="text-sm text-blue-600 hover:underline"
        >
          Aplikovat výchozí hodnoty na všechny pracovní dny
        </button>

        {/* Per-day configuration */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Rozvrh dle dnů</Label>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-left">Den</th>
                  <th className="p-2 text-center">Pracovní</th>
                  <th className="p-2 text-center">Začátek</th>
                  <th className="p-2 text-center">Hodiny</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
                  const daySchedule = workSchedule.days[dayOfWeek] || {
                    isWorkDay: dayOfWeek !== 0 && dayOfWeek !== 6,
                    startTime: workSchedule.defaultStartTime,
                    hours: workSchedule.defaultHours,
                  }
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

                  return (
                    <tr
                      key={dayOfWeek}
                      className={isWeekend ? 'bg-gray-50' : ''}
                    >
                      <td className="p-2 font-medium">{DAY_NAMES[dayOfWeek]}</td>
                      <td className="p-2 text-center">
                        <Checkbox
                          checked={daySchedule.isWorkDay}
                          onCheckedChange={(checked) =>
                            updateDaySchedule(dayOfWeek, {
                              isWorkDay: checked === true,
                              hours: checked ? workSchedule.defaultHours : 0,
                            })
                          }
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Input
                          value={daySchedule.startTime}
                          onChange={(e) =>
                            updateDaySchedule(dayOfWeek, { startTime: e.target.value })
                          }
                          disabled={!daySchedule.isWorkDay}
                          className="w-20 h-8 text-center text-xs mx-auto"
                          placeholder="6:00"
                        />
                      </td>
                      <td className="p-2 text-center">
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
                          disabled={!daySchedule.isWorkDay}
                          className="w-16 h-8 text-center text-xs mx-auto"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Poznámka: Změny rozvrhu se projeví až při načtení nového měsíce.
        </p>
      </CardContent>
    </Card>
  )
}
