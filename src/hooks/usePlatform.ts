'use client'

import { useState, useEffect } from 'react'
import { isTauri } from '@/lib/tauri'

export function usePlatform() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setIsDesktop(isTauri())
  }, [])

  return { isDesktop }
}
