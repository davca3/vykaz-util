'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

function parseTime(time: string): { hours: number; minutes: number } {
  if (!time) return { hours: 6, minutes: 0 }
  const normalized = time.replace('.', ':')
  const [h, m] = normalized.split(':').map(Number)
  return { hours: h || 0, minutes: m || 0 }
}

function formatTime(hours: number, minutes: number): string {
  return `${hours}:${minutes.toString().padStart(2, '0')}`
}

export function TimeInput({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = '6:00',
}: TimeInputProps) {
  const { hours, minutes } = parseTime(value)

  const adjustTime = (delta: number) => {
    if (disabled) return

    let totalMinutes = hours * 60 + minutes + delta
    if (totalMinutes < 0) totalMinutes = 0
    if (totalMinutes > 24 * 60) totalMinutes = 24 * 60

    const newHours = Math.floor(totalMinutes / 60)
    const newMinutes = totalMinutes % 60
    onChange(formatTime(newHours, newMinutes))
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = Math.min(24, Math.max(0, parseInt(e.target.value) || 0))
    onChange(formatTime(newHours, minutes))
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
    onChange(formatTime(hours, newMinutes))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      adjustTime(30)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      adjustTime(-30)
    }
  }

  if (disabled) {
    return (
      <div className={cn(
        'flex items-center justify-center h-7 text-xs text-muted-foreground bg-muted rounded border',
        className
      )}>
        {value || placeholder}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center h-7 border rounded bg-background text-xs',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => adjustTime(-30)}
        disabled={disabled}
        className="px-1 h-full hover:bg-muted rounded-l transition-colors"
        tabIndex={-1}
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      <div className="flex items-center">
        <input
          type="number"
          value={hours}
          onChange={handleHoursChange}
          disabled={disabled}
          min={0}
          max={24}
          className="w-6 text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span>:</span>
        <input
          type="number"
          value={minutes.toString().padStart(2, '0')}
          onChange={handleMinutesChange}
          disabled={disabled}
          min={0}
          max={59}
          step={30}
          className="w-6 text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <button
        type="button"
        onClick={() => adjustTime(30)}
        disabled={disabled}
        className="px-1 h-full hover:bg-muted rounded-r transition-colors"
        tabIndex={-1}
      >
        <ChevronUp className="h-3 w-3" />
      </button>
    </div>
  )
}
