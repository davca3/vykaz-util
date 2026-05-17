'use client'

/**
 * Open an external URL in the system's default browser.
 * Uses Tauri's opener plugin in the desktop app, falls back to window.open on the web.
 */
export async function openExternal(url: string): Promise<void> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
