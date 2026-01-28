'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getWorkingDaysInMonth, getHolidaysInMonth } from '@/lib/holidays'

export function Summary() {
  const { currentMonth, previousMonthsNV, setPreviousMonthsNV } = useTimesheetStore()

  if (!currentMonth) {
    return null
  }

  const workingDays = getWorkingDaysInMonth(currentMonth.year, currentMonth.month)
  const holidays = getHolidaysInMonth(currentMonth.year, currentMonth.month)
  const fondPracovniDoby = (workingDays + holidays) * 8

  // Calculate NV balance (overtime not paid goes to NV)
  const overtimeToNV = currentMonth.totalOvertimeHours - currentMonth.totalOvertimeToPayHours
  const nvBalance = previousMonthsNV + overtimeToNV - currentMonth.totalCompensatoryLeaveHours

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Shrnutí hodin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Odpracováno celkem:</span>
            <span className="font-bold">{currentMonth.totalWorkedHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Přesčas tento měsíc:</span>
            <span className="font-bold">{currentMonth.totalOvertimeHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Čerpání náhradního volna:</span>
            <span className="font-bold">{currentMonth.totalCompensatoryLeaveHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Propustky celkem:</span>
            <span className="font-bold">{currentMonth.totalPassHours} hod</span>
          </div>
          <hr />
          <div className="flex justify-between">
            <span>Dovolená (dnů):</span>
            <span className="font-bold">{currentMonth.totalVacationDays}</span>
          </div>
          <div className="flex justify-between">
            <span>Dovolená (hodin):</span>
            <span className="font-bold">{currentMonth.totalVacationHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Nemocenská (dnů):</span>
            <span className="font-bold">{currentMonth.totalSickDays}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FPD - Fond pracovní doby</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Pracovní dny:</span>
            <span className="font-bold">{workingDays}</span>
          </div>
          <div className="flex justify-between">
            <span>Svátky (pracovní dny):</span>
            <span className="font-bold">{holidays}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>FPD celkem:</span>
            <span className="font-bold">{fondPracovniDoby} hod</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NV - Náhradní volno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="previousNV">NV z minulých měsíců:</Label>
            <Input
              id="previousNV"
              type="number"
              step="0.5"
              value={previousMonthsNV}
              onChange={(e) => setPreviousMonthsNV(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
          </div>
          <div className="flex justify-between">
            <span>+ Přesčas (do NV):</span>
            <span className="font-bold text-green-600">+{overtimeToNV} hod</span>
          </div>
          <div className="flex justify-between">
            <span>- Čerpáno:</span>
            <span className="font-bold text-red-600">-{currentMonth.totalCompensatoryLeaveHours} hod</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>NV zůstatek:</span>
            <span className="font-bold">{nvBalance} hod</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hodiny k proplacení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Přesčas k proplacení:</span>
            <span className="font-bold">{currentMonth.totalOvertimeToPayHours} hod</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Zadejte hodiny k proplacení ve sloupci "Přesč. propl." v tabulce výkazu
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
