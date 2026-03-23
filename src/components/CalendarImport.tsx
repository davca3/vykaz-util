'use client'

import { useState } from 'react'
import { useTimesheetStore } from '@/store/timesheet-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'
import { invokeTauri } from '@/lib/tauri'

interface CalendarEvent {
  day: number
  title: string
}

export function CalendarImport() {
  const { isDesktop } = usePlatform()
  const { currentMonth, updateDayEntry } = useTimesheetStore()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isDesktop || !currentMonth) return null

  const handleImport = async () => {
    setLoading(true)
    setError(null)

    try {
      // Request calendar access
      const granted = await invokeTauri<boolean>('request_calendar_access')
      if (!granted) {
        setError('Přístup ke kalendáři byl zamítnut. Povolte ho v Nastavení systému → Soukromí a zabezpečení → Kalendáře.')
        return
      }

      // Read vacation events
      const found = await invokeTauri<CalendarEvent[]>('read_vacation_events', {
        year: currentMonth.year,
        month: currentMonth.month,
      })

      // Filter to valid days in this month and exclude weekends/holidays
      const maxDay = currentMonth.days.length
      const validEvents = found.filter(e => {
        if (e.day < 1 || e.day > maxDay) return false
        const dayEntry = currentMonth.days[e.day - 1]
        return !dayEntry.isWeekend && !dayEntry.isHoliday
      })

      if (validEvents.length === 0) {
        setError('V kalendáři nebyly nalezeny žádné dovolené pro tento měsíc.')
        return
      }

      setEvents(validEvents)
      setSelected(new Set(validEvents.map(e => e.day)))
      setShowDialog(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return next
    })
  }

  const handleConfirm = () => {
    for (const day of Array.from(selected)) {
      const dayEntry = currentMonth.days[day - 1]
      updateDayEntry(day, {
        interruptionType: 'D',
        workedHours: 0,
        vacationHours: dayEntry.scheduledHours,
      })
    }
    setShowDialog(false)
    setEvents([])
    setSelected(new Set())
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Kalendář
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleImport} disabled={loading} variant="outline" className="w-full">
            <Calendar className="mr-2 h-4 w-4" />
            {loading ? 'Načítám...' : 'Importovat dovolené z kalendáře'}
          </Button>
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nalezené dovolené</DialogTitle>
            <DialogDescription>
              Vyberte dny, které chcete označit jako dovolenou.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-64 overflow-y-auto">
            {events.map(event => (
              <label
                key={event.day}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(event.day)}
                  onCheckedChange={() => toggleDay(event.day)}
                />
                <span className="text-sm">
                  <span className="font-medium">{event.day}.</span>{' '}
                  {event.title}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0}>
              Vyplnit ({selected.size} {selected.size === 1 ? 'den' : selected.size < 5 ? 'dny' : 'dnů'})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
