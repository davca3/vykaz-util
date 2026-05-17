'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TimeInput } from '@/components/ui/time-input'
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
  { value: 'NV', label: 'NV - Náhradní volno' },
  { value: 'P', label: 'P - Překážky (lékař...)' },
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

  const showPasses = currentMonth.days.some(
    d => d.passHours > 0 || d.interruptionType === 'P'
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pracovní výkaz</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Group headers */}
              <tr className="bg-muted">
                <th colSpan={4} className="p-2 text-center font-bold border border-gray-300">
                  Základní údaje
                </th>
                <th colSpan={2} className="p-2 text-center font-bold border border-gray-300 bg-blue-50">
                  Odpracované
                </th>
                <th colSpan={3} className="p-2 text-center font-bold border border-gray-300 bg-orange-50">
                  NV - Náhradní volno
                </th>
                {showPasses && (
                  <th colSpan={3} className="p-2 text-center font-bold border border-gray-300 bg-green-50">
                    Propustky
                  </th>
                )}
              </tr>
              {/* Column headers */}
              <tr className="bg-muted/50">
                <th className="p-2 text-left border border-gray-300 text-xs">Den</th>
                <th className="p-2 text-left border border-gray-300 text-xs">Datum</th>
                <th className="p-2 text-left border border-gray-300 text-xs">Typ</th>
                <th className="p-2 text-center border border-gray-300 text-xs">Od</th>
                {/* Odpracované */}
                <th className="p-2 text-center border border-gray-300 text-xs bg-blue-50/50">Hodiny</th>
                <th className="p-2 text-center border border-gray-300 text-xs bg-blue-50/50">Dov.</th>
                {/* NV - Náhradní volno */}
                <th className="p-2 text-center border border-gray-300 text-xs bg-orange-50/50">Přesčas</th>
                <th className="p-2 text-center border border-gray-300 text-xs bg-orange-50/50">K propl.</th>
                <th className="p-2 text-center border border-gray-300 text-xs bg-orange-50/50">Čerpání</th>
                {showPasses && (
                  <>
                    <th className="p-2 text-center border border-gray-300 text-xs bg-green-50/50">Hod.</th>
                    <th className="p-2 text-center border border-gray-300 text-xs bg-green-50/50">Od</th>
                    <th className="p-2 text-left border border-gray-300 text-xs bg-green-50/50">Důvod</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentMonth.days.map((day) => {
                const isDisabled = day.isWeekend || day.isHoliday
                const rowClass = day.isWeekend
                  ? 'bg-gray-100'
                  : day.isHoliday
                  ? 'bg-yellow-50'
                  : ''

                return (
                  <tr key={day.dayOfMonth} className={`${rowClass}`}>
                    {/* Základní údaje */}
                    <td className="p-1 font-medium border border-gray-200 text-center">
                      {DAY_NAMES[day.dayOfWeek]}
                    </td>
                    <td className="p-1 border border-gray-200">
                      {day.dayOfMonth}.{currentMonth.month}.
                    </td>
                    <td className="p-1 border border-gray-200">
                      {isDisabled ? (
                        <span className="text-muted-foreground text-xs">
                          {day.isHoliday ? (day.holidayName || 'Svátek') : (day.dayOfWeek === 0 ? 'Neděle' : 'Sobota')}
                        </span>
                      ) : (
                        <Select
                          value={toSelectValue(day.interruptionType)}
                          onValueChange={(v) =>
                            updateDayEntry(day.dayOfMonth, {
                              interruptionType: fromSelectValue(v) as InterruptionType,
                            })
                          }
                        >
                          <SelectTrigger className="w-full min-w-[120px] h-7 text-xs px-2">
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

                    {/* Začátek práce */}
                    <td className="p-1 border-r-2 border-r-gray-400 border border-gray-200">
                      <TimeInput
                        value={day.startTime || '6:00'}
                        onChange={(value) =>
                          updateDayEntry(day.dayOfMonth, {
                            startTime: value,
                          })
                        }
                        disabled={isDisabled}
                        className="w-full min-w-[3rem]"
                      />
                    </td>

                    {/* Odpracované - modrá */}
                    <td className="p-1 border border-gray-200 bg-blue-50/30">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.workedHours || ''}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            workedHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-full min-w-[3.5rem] h-7 text-center text-xs px-1"
                      />
                    </td>
                    <td className="p-1 border-r-2 border-r-gray-400 border border-gray-200 bg-blue-50/30">
                      <Input
                        type="number"
                        min="0"
                        max="8"
                        step="0.5"
                        value={day.vacationHours || ''}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            vacationHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled || day.interruptionType !== 'D'}
                        className="w-full min-w-[3.5rem] h-7 text-center text-xs px-1"
                      />
                    </td>

                    {/* Přesčasy - oranžová */}
                    <td className="p-1 border border-gray-200 bg-orange-50/30">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={Math.max(0, day.overtimeHours - day.overtimeToPayHours) || ''}
                        disabled={isDisabled}
                        className="w-full min-w-[3.5rem] h-7 text-center text-xs px-1 bg-orange-50"
                        readOnly
                      />
                    </td>
                    <td className="p-1 border border-gray-200 bg-orange-50/30">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.overtimeToPayHours || ''}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            overtimeToPayHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled}
                        className="w-full min-w-[3.5rem] h-7 text-center text-xs px-1"
                      />
                    </td>
                    <td className="p-1 border-r-2 border-r-gray-400 border border-gray-200 bg-orange-50/30">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={day.compensatoryLeaveHours || ''}
                        onChange={(e) =>
                          updateDayEntry(day.dayOfMonth, {
                            compensatoryLeaveHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isDisabled || day.interruptionType === 'NV'}
                        className="w-full min-w-[3.5rem] h-7 text-center text-xs px-1"
                      />
                    </td>

                    {/* Propustky - zelená (skryté když nejsou žádné) */}
                    {showPasses && (
                      <>
                        <td className="p-1 border border-gray-200 bg-green-50/30">
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={day.passHours || ''}
                            onChange={(e) =>
                              updateDayEntry(day.dayOfMonth, {
                                passHours: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={isDisabled}
                            className="w-full min-w-[3.5rem] h-7 text-center text-xs px-1"
                          />
                        </td>
                        <td className="p-1 border border-gray-200 bg-green-50/30">
                          <TimeInput
                            value={day.passFrom || ''}
                            onChange={(value) =>
                              updateDayEntry(day.dayOfMonth, {
                                passFrom: value,
                              })
                            }
                            disabled={isDisabled || day.passHours === 0}
                            className="min-w-[4rem]"
                          />
                        </td>
                        <td className="p-1 border border-gray-200 bg-green-50/30">
                          <Input
                            value={day.passReason || ''}
                            onChange={(e) =>
                              updateDayEntry(day.dayOfMonth, {
                                passReason: e.target.value,
                              })
                            }
                            disabled={isDisabled || day.passHours === 0}
                            placeholder="Důvod"
                            className="w-full min-w-[4rem] h-7 text-xs px-1"
                          />
                        </td>
                      </>
                    )}
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
