'use client'

import { Button } from '@/components/ui/button'
import { Download, Share2 } from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'
import { useTimesheetStore } from '@/store/timesheet-store'

const RELEASE_URL = 'https://github.com/davca3/vykaz-util/releases/latest'

export function DownloadApp() {
  const { isDesktop } = usePlatform()
  const { settings, previousMonthsNV } = useTimesheetStore()

  if (isDesktop) return null

  const handleTransfer = () => {
    const data = {
      settings,
      previousMonthsNV,
    }
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    const url = `vykaz://import?data=${encoded}`
    window.location.href = url
  }

  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
      <span>Desktopová verze s exportem PDF a importem z kalendáře</span>
      <Button
        size="sm"
        variant="outline"
        className="border-blue-300 text-blue-700 hover:bg-blue-100"
        onClick={() => window.open(RELEASE_URL, '_blank')}
      >
        <Download className="mr-1 h-3 w-3" />
        Stáhnout
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-blue-300 text-blue-700 hover:bg-blue-100"
        onClick={handleTransfer}
      >
        <Share2 className="mr-1 h-3 w-3" />
        Přenést do appky
      </Button>
    </div>
  )
}
