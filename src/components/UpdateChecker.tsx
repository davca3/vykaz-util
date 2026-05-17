'use client'

import { useEffect, useState } from 'react'
import { usePlatform } from '@/hooks/usePlatform'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshCw } from 'lucide-react'
import type { Update } from '@tauri-apps/plugin-updater'

const SEEN_VERSION_KEY = 'vykaz-update-seen-version'

export function UpdateChecker() {
  const { isDesktop } = usePlatform()
  const [update, setUpdate] = useState<Update | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!isDesktop) return

    async function checkForUpdate() {
      try {
        const { check } = await import('@tauri-apps/plugin-updater')
        const result = await check()
        if (!result) return
        setUpdate(result)
        // Auto-open the dialog the first time a given version is seen
        const lastSeen = localStorage.getItem(SEEN_VERSION_KEY)
        if (lastSeen !== result.version) {
          setShowDialog(true)
        }
      } catch (err) {
        console.error('Update check failed:', err)
      }
    }

    // Delay to not block startup
    const timer = setTimeout(checkForUpdate, 2000)
    return () => clearTimeout(timer)
  }, [isDesktop])

  const handleUpdate = async () => {
    if (!update) return
    setUpdating(true)
    try {
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (err) {
      console.error('Update failed:', err)
      alert('Aktualizace selhala. Zkuste to znovu později.')
      setUpdating(false)
    }
  }

  const handleDismiss = () => {
    if (update) {
      localStorage.setItem(SEEN_VERSION_KEY, update.version)
    }
    setShowDialog(false)
  }

  if (!update) return null

  return (
    <>
      <Dialog open={showDialog} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nová verze {update.version} je dostupná</DialogTitle>
            <DialogDescription>
              Aktuální verze: {update.currentVersion}
              {update.date && ` · vydáno ${update.date.slice(0, 10)}`}
            </DialogDescription>
          </DialogHeader>
          {update.body ? (
            <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm border rounded-md p-3 bg-muted/30">
              {update.body}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Bez poznámek k vydání.</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDismiss} disabled={updating}>
              Později
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              <RefreshCw className={`mr-1 h-3 w-3 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Aktualizuji...' : 'Aktualizovat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!showDialog && (
        <div className="flex items-center justify-center gap-3 py-2 px-4 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700 mb-4">
          <span>Nová verze {update.version} je dostupná!</span>
          <Button
            size="sm"
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-100"
            onClick={() => setShowDialog(true)}
            disabled={updating}
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${updating ? 'animate-spin' : ''}`} />
            Zobrazit detail
          </Button>
        </div>
      )}
    </>
  )
}
