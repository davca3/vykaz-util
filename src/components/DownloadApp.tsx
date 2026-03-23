'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'

const RELEASE_URL = 'https://github.com/davca3/vykaz-util/releases/latest'

export function DownloadApp() {
  const { isDesktop } = usePlatform()

  if (isDesktop) return null

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
    </div>
  )
}
