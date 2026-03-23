'use client'

import { useEffect, useState } from 'react'
import { usePlatform } from '@/hooks/usePlatform'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function UpdateChecker() {
  const { isDesktop } = usePlatform()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (!isDesktop) return

    async function checkForUpdate() {
      try {
        const { check } = await import('@tauri-apps/plugin-updater')
        const update = await check()
        if (update) {
          setUpdateAvailable(true)
          setVersion(update.version)
        }
      } catch (err) {
        console.error('Update check failed:', err)
      }
    }

    // Check after 2 seconds to not block startup
    const timer = setTimeout(checkForUpdate, 2000)
    return () => clearTimeout(timer)
  }, [isDesktop])

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (update) {
        await update.downloadAndInstall()
        const { relaunch } = await import('@tauri-apps/plugin-process')
        await relaunch()
      }
    } catch (err) {
      console.error('Update failed:', err)
      alert('Aktualizace selhala. Zkuste to znovu později.')
      setUpdating(false)
    }
  }

  if (!updateAvailable) return null

  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700 mb-4">
      <span>Nová verze {version} je dostupná!</span>
      <Button
        size="sm"
        variant="outline"
        className="border-green-300 text-green-700 hover:bg-green-100"
        onClick={handleUpdate}
        disabled={updating}
      >
        <RefreshCw className={`mr-1 h-3 w-3 ${updating ? 'animate-spin' : ''}`} />
        {updating ? 'Aktualizuji...' : 'Aktualizovat'}
      </Button>
    </div>
  )
}
