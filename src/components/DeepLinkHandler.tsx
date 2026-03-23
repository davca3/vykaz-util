'use client'

import { useEffect } from 'react'
import { usePlatform } from '@/hooks/usePlatform'
import { useTimesheetStore } from '@/store/timesheet-store'

export function DeepLinkHandler() {
  const { isDesktop } = usePlatform()
  const { setSettings, setPreviousMonthsNV } = useTimesheetStore()

  useEffect(() => {
    if (!isDesktop) return

    let unlisten: (() => void) | undefined

    async function setup() {
      const { listen } = await import('@tauri-apps/api/event')
      unlisten = await listen<string>('deep-link-import', (event) => {
        try {
          // URL format: vykaz://import?data=base64encodedJSON
          // or the payload might be a JSON string of URLs
          let url = event.payload
          // Remove surrounding quotes if present
          if (url.startsWith('"')) url = url.slice(1)
          if (url.endsWith('"')) url = url.slice(0, -1)
          // Handle array format ["url"]
          if (url.startsWith('[')) {
            const parsed = JSON.parse(url)
            url = Array.isArray(parsed) ? parsed[0] : url
          }

          const urlObj = new URL(url)
          const data = urlObj.searchParams.get('data')
          if (!data) return

          const decoded = JSON.parse(atob(data))

          if (decoded.settings) {
            setSettings(decoded.settings)
          }
          if (typeof decoded.previousMonthsNV === 'number') {
            setPreviousMonthsNV(decoded.previousMonthsNV)
          }

          alert('Nastavení bylo úspěšně importováno z webové verze!')
        } catch (err) {
          console.error('Deep link import error:', err)
          alert('Chyba při importu nastavení.')
        }
      })
    }

    setup()
    return () => { unlisten?.() }
  }, [isDesktop, setSettings, setPreviousMonthsNV])

  return null
}
