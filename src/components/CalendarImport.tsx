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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'
import { invokeTauri } from '@/lib/tauri'

type EventType = 'vacation' | 'compTime'
type EntryKind = 'D' | 'NV'

interface CalendarEvent {
  day: number
  title: string
  isHalfDay: boolean
  eventType: EventType
}

const defaultKind = (eventType: EventType): EntryKind =>
  eventType === 'compTime' ? 'NV' : 'D'

export function CalendarImport() {
  const { isDesktop } = usePlatform()
  const { currentMonth, updateDayEntry } = useTimesheetStore()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [kinds, setKinds] = useState<Map<number, EntryKind>>(new Map())
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isDesktop || !currentMonth) return null

  const handleImport = async () => {
    setLoading(true)
    setError(null)

    try {
      const granted = await invokeTauri<boolean>('request_calendar_access')
      if (!granted) {
        setError('Přístup ke kalendáři byl zamítnut. Povolte ho v Nastavení systému → Soukromí a zabezpečení → Kalendáře.')
        return
      }

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
        setError('V kalendáři nebyly nalezeny žádné dovolené ani náhradní volno pro tento měsíc.')
        return
      }

      setEvents(validEvents)
      setSelected(new Set(validEvents.map(e => e.day)))
      setKinds(new Map(validEvents.map(e => [e.day, defaultKind(e.eventType)])))
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

  const setKind = (day: number, kind: EntryKind) => {
    setKinds(prev => {
      const next = new Map(prev)
      next.set(day, kind)
      return next
    })
  }

  const handleConfirm = () => {
    for (const day of Array.from(selected)) {
      const dayEntry = currentMonth.days[day - 1]
      const event = events.find(e => e.day === day)
      if (!event) continue
      const kind = kinds.get(day) ?? defaultKind(event.eventType)
      const halfHours = dayEntry.scheduledHours / 2

      if (kind === 'D') {
        if (event.isHalfDay) {
          updateDayEntry(day, {
            interruptionType: 'D',
            workedHours: halfHours,
            vacationHours: halfHours,
          })
        } else {
          updateDayEntry(day, {
            interruptionType: 'D',
            workedHours: 0,
            vacationHours: dayEntry.scheduledHours,
          })
        }
      } else {
        if (event.isHalfDay) {
          // Half-day NV: keep typ pole prázdné, jen čerpání + odpracovaná polovina
          updateDayEntry(day, {
            interruptionType: '',
            workedHours: halfHours,
            compensatoryLeaveHours: halfHours,
          })
        } else {
          updateDayEntry(day, {
            interruptionType: 'NV',
            workedHours: 0,
            compensatoryLeaveHours: dayEntry.scheduledHours,
          })
        }
      }
    }
    setShowDialog(false)
    setEvents([])
    setSelected(new Set())
    setKinds(new Map())
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
            {loading ? 'Načítám...' : 'Importovat z kalendáře'}
          </Button>
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nalezené události</DialogTitle>
            <DialogDescription>
              Vyberte dny a zvolte, zda se jedná o dovolenou (D) nebo náhradní volno (NV).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-72 overflow-y-auto">
            {events.map(event => {
              const kind = kinds.get(event.day) ?? defaultKind(event.eventType)
              return (
                <div key={event.day} className="flex items-center gap-3">
                  <Checkbox
                    checked={selected.has(event.day)}
                    onCheckedChange={() => toggleDay(event.day)}
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{event.day}.</span>{' '}
                    {event.title}
                    {event.isHalfDay && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(půl dne, 4h)</span>
                    )}
                  </div>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(event.day, v as EntryKind)}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D">Dovolená</SelectItem>
                      <SelectItem value="NV">Náhradní volno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
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
