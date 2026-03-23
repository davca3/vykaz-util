'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, Share2 } from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'
import { useTimesheetStore } from '@/store/timesheet-store'

const RELEASE_URL = 'https://github.com/davca3/vykaz-util/releases/latest'

export function DownloadApp() {
  const { isDesktop } = usePlatform()
  const { settings, previousMonthsNV } = useTimesheetStore()
  const [showDialog, setShowDialog] = useState(false)

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

  const handleDownload = () => {
    setShowDialog(true)
  }

  const handleConfirmDownload = () => {
    setShowDialog(false)
    window.open(RELEASE_URL, '_blank')
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3 py-2 px-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <span>Desktopová verze s exportem PDF a importem z kalendáře</span>
        <Button
          size="sm"
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
          onClick={handleDownload}
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
          Přenést nastavení z webu do appky
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Instalace aplikace</DialogTitle>
            <DialogDescription>
              Po stažení a přesunutí do Applications je potřeba spustit v Terminálu tento příkaz, aby macOS aplikaci povolil:
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <code className="block bg-gray-100 rounded-md px-4 py-3 text-sm font-mono select-all">
              xattr -cr &quot;/Applications/Výkaz práce.app&quot;
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Poté aplikaci otevřete normálně. Toto je potřeba udělat pouze jednou.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleConfirmDownload}>
              Rozumím, stáhnout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
