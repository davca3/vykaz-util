'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
]

export function MonthSelector() {
  const { initializeMonth, currentMonth } = useTimesheetStore()
  const now = new Date()

  useEffect(() => {
    if (!currentMonth) {
      initializeMonth(now.getFullYear(), now.getMonth() + 1)
    }
  }, [])

  const years = []
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    years.push(y)
  }

  const handlePrevMonth = () => {
    if (!currentMonth) return
    let newMonth = currentMonth.month - 1
    let newYear = currentMonth.year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    initializeMonth(newYear, newMonth)
  }

  const handleNextMonth = () => {
    if (!currentMonth) return
    let newMonth = currentMonth.month + 1
    let newYear = currentMonth.year
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    initializeMonth(newYear, newMonth)
  }

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Button variant="outline" size="icon" onClick={handlePrevMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Select
          value={currentMonth?.month.toString() ?? (now.getMonth() + 1).toString()}
          onValueChange={(v) => initializeMonth(currentMonth?.year ?? now.getFullYear(), parseInt(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month, idx) => (
              <SelectItem key={idx} value={(idx + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentMonth?.year.toString() ?? now.getFullYear().toString()}
          onValueChange={(v) => initializeMonth(parseInt(v), currentMonth?.month ?? now.getMonth() + 1)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
