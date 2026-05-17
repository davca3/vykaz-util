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
import { Sparkles } from 'lucide-react'
import { openExternal } from '@/lib/openExternal'

const GITHUB_REPO = 'davca3/vykaz-util'

interface ReleaseInfo {
  version: string
  name: string
  body: string
  publishedAt?: string
  htmlUrl: string
}

async function fetchRelease(version: string | null): Promise<ReleaseInfo> {
  const base = `https://api.github.com/repos/${GITHUB_REPO}/releases`
  const url = version ? `${base}/tags/v${version}` : `${base}/latest`
  let res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  // Fallback to latest if tag not found
  if (res.status === 404 && version) {
    res = await fetch(`${base}/latest`, { headers: { Accept: 'application/vnd.github+json' } })
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const data = await res.json()
  return {
    version: (data.tag_name || '').replace(/^v/, ''),
    name: data.name || data.tag_name || '',
    body: data.body || '',
    publishedAt: data.published_at,
    htmlUrl: data.html_url,
  }
}

export function ReleaseNotes() {
  const { isDesktop } = usePlatform()
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [release, setRelease] = useState<ReleaseInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isDesktop) return
    let cancelled = false
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then((v) => {
        if (!cancelled) setCurrentVersion(v)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isDesktop])

  const openDialog = async () => {
    setShowDialog(true)
    if (release) return
    setLoading(true)
    setError(null)
    try {
      const info = await fetchRelease(currentVersion)
      setRelease(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        title="Co je nového"
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Co je nového</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {release ? `Co je nového${release.version ? ` v ${release.version}` : ''}` : 'Co je nového'}
            </DialogTitle>
            <DialogDescription>
              {release?.publishedAt
                ? `Vydáno ${release.publishedAt.slice(0, 10)}`
                : currentVersion
                ? `Aktuální verze: ${currentVersion}`
                : 'Načítám…'}
            </DialogDescription>
          </DialogHeader>
          {loading && (
            <p className="text-sm text-muted-foreground">Načítám poznámky k vydání…</p>
          )}
          {error && (
            <p className="text-sm text-red-500">Nepodařilo se načíst: {error}</p>
          )}
          {release && !loading && (
            release.body ? (
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm border rounded-md p-3 bg-muted/30">
                {release.body}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pro tuto verzi nejsou k dispozici poznámky.</p>
            )
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {release?.htmlUrl && (
              <button
                type="button"
                onClick={() => openExternal(release.htmlUrl)}
                className="text-sm text-blue-600 hover:underline self-center"
              >
                Otevřít na GitHubu
              </button>
            )}
            <Button onClick={() => setShowDialog(false)}>Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
