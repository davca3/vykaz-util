'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Summary() {
  const { currentMonth, previousMonthsNV, setPreviousMonthsNV } = useTimesheetStore()

  if (!currentMonth) {
    return null
  }

  // Calculate NV balance (overtime not paid goes to NV)
  const overtimeToNV = currentMonth.totalOvertimeHours - currentMonth.totalOvertimeToPayHours
  const nvBalance = previousMonthsNV + overtimeToNV - currentMonth.totalCompensatoryLeaveHours

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shrnutí hodin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Odpracováno celkem:</span>
            <span className="font-bold">{currentMonth.totalWorkedHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Přesčas tento měsíc:</span>
            <span className="font-bold">{currentMonth.totalOvertimeHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Čerpání NV:</span>
            <span className="font-bold">{currentMonth.totalCompensatoryLeaveHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Propustky:</span>
            <span className="font-bold">{currentMonth.totalPassHours} hod</span>
          </div>
          <hr />
          <div className="flex justify-between">
            <span>Dovolená:</span>
            <span className="font-bold">{currentMonth.totalVacationDays} dnů / {currentMonth.totalVacationHours} hod</span>
          </div>
          <div className="flex justify-between">
            <span>Nemocenská:</span>
            <span className="font-bold">{currentMonth.totalSickDays} dnů</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">NV - Náhradní volno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Label htmlFor="previousNV" className="whitespace-nowrap">Z min. měsíců:</Label>
            <Input
              id="previousNV"
              type="number"
              step="0.5"
              value={previousMonthsNV}
              onChange={(e) => setPreviousMonthsNV(parseFloat(e.target.value) || 0)}
              className="w-20 h-7 text-sm"
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
          <div className="flex justify-between">
            <span>K proplacení:</span>
            <span className="font-bold text-blue-600">{currentMonth.totalOvertimeToPayHours} hod</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>NV zůstatek:</span>
            <span className="font-bold">{nvBalance} hod</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
