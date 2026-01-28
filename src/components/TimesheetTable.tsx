'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InterruptionType } from '@/types'

// Use "_WORK" as placeholder since Radix Select doesn't allow empty strings
const WORK_VALUE = '_WORK'

const INTERRUPTION_TYPES: { value: string; label: string }[] = [
  { value: WORK_VALUE, label: 'Práce' },
  { value: 'Sv', label: 'Sv - Svátek' },
  { value: 'D', label: 'D - Dovolená' },
  { value: 'N', label: 'N - Nemocenská' },
  { value: 'Oš', label: 'Oš - Ošetřování' },
  { value: 'NV', label: 'NV - Náhradní volno' },
  { value: 'P', label: 'P - Překážky (lékař...)' },
  { value: 'M', label: 'M - Mateřství' },
  { value: 'RD', label: 'RD - Rodičovská' },
  { value: 'NP', label: 'NP - Neplacené volno' },
]

// Convert between store value (empty string) and Select value (WORK_VALUE)
const toSelectValue = (v: string) => v === '' ? WORK_VALUE : v
const fromSelectValue = (v: string) => v === WORK_VALUE ? '' : v

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

export function TimesheetTable() {
  const { currentMonth, updateDayEntry } = useTimesheetStore()

  if (!currentMonth) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Vyberte období pro zobrazení výkazu
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pracovní výkaz</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left">Den</th>
                <th className="p-2 text-left">Datum</th>
                <th className="p-2 text-left">Typ</th>
                <th className="p-2 text-center">Odprac.</th>
                <th className="p-2 text-center">Dov. hod.</th>
                <th className="p-2 text-center">Přesčas</th>
                <th className="p-2 text-center">Přesč. propl.</th>
                <th className="p-2 text-center">Čerp. NV</th>
                <th className="p-2 text-center">Propust.</th>
                <th className="p-2 text-left">Důvod</th>
                <th className="p-2 text-center">Od-Do</th>
              </tr>
            </thead>
            <tbody>
              {currentMonth.days.map((day) => {
                const isDisabled = day.isWeekend
                const rowClass = day.isWeekend
                  ? 'bg-gray-100'
                  : day.isHoliday
                  ? 'bg-yellow-50'
                  : ''

                return (
                  <tr key={day.dayOfMonth} className={`border-b ${rowClass}`}>
                    <td className="p-2 font-medium">
                      {DAY_NAMES[day.dayOfWeek]}
                    </td>
                    <td className="p-2">
                      {day.dayOfMonth}.{currentMonth.month}.
                    </td>
                    <td className="p-2">
                      {isDisabled ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <Select
                          value={toSelectValue(day.interruptionType)}
                          onValueChange={(v) =>
                            updateDayEntry(day.dayOfMonth, {
                              interruptionType: fromSelectValue(v) as InterruptionType,
                            })
                          }
                          disabled={day.isHoliday}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERRUPTION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.workedHours}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            workedHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-14 h-8 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="8"
                        step="0.5"
                        value={day.vacationHours}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            vacationHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled || day.interruptionType !== 'D'}
                        className="w-14 h-8 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.overtimeHours}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            overtimeHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-14 h-8 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.overtimeToPayHours}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            overtimeToPayHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-14 h-8 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.compensatoryLeaveHours}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            compensatoryLeaveHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-14 h-8 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.passHours}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            passHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-14 h-8 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={day.passReason || ''}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            passReason: e.target.value,
                          })
                        }
                        disabled={isDisabled || day.passHours === 0}
                        placeholder="Důvod"
                        className="w-24 h-8"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Input
                          value={day.passFrom || ''}
                          onChange={(e) =>
                            updateDayEntry(day.dayOfMonth, {
                              passFrom: e.target.value,
                            })
                          }
                          disabled={isDisabled || day.passHours === 0}
                          placeholder="Od"
                          className="w-16 h-8"
                        />
                        <Input
                          value={day.passTo || ''}
                          onChange={(e) =>
                            updateDayEntry(day.dayOfMonth, {
                              passTo: e.target.value,
                            })
                          }
                          disabled={isDisabled || day.passHours === 0}
                          placeholder="Do"
                          className="w-16 h-8"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
