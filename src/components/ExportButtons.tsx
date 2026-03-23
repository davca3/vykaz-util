'use client'

import { useState, useEffect } from 'react'
import { useTimesheetStore } from '@/store/timesheet-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { exportToExcel, getFilename } from '@/lib/export'
import { FileSpreadsheet, FileText, Send } from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'
import { invokeTauri } from '@/lib/tauri'

const SLACK_DM_URL = 'https://inventmedical.slack.com/team/U02UEA0QX6E'

export function ExportButtons() {
  const { currentMonth, settings, previousMonthsNV, setPreviousMonthsNV } = useTimesheetStore()
  const [showNVPrompt, setShowNVPrompt] = useState(false)
  const [nvBalance, setNvBalance] = useState(0)
  const [libreOfficeAvailable, setLibreOfficeAvailable] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { isDesktop } = usePlatform()

  // Check LibreOffice availability on desktop
  useEffect(() => {
    if (!isDesktop) return
    invokeTauri<boolean>('check_libreoffice')
      .then(setLibreOfficeAvailable)
      .catch(() => setLibreOfficeAvailable(false))
  }, [isDesktop])

  // Prevent leaving page when modal is open
  useEffect(() => {
    if (!showNVPrompt) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [showNVPrompt])

  const calculateAndPromptNV = () => {
    if (!currentMonth) return
    const overtimeToNV = currentMonth.totalOvertimeHours - currentMonth.totalOvertimeToPayHours
    const balance = previousMonthsNV + overtimeToNV - currentMonth.totalCompensatoryLeaveHours
    setNvBalance(balance)
    setShowNVPrompt(true)
  }

  const handleSaveNV = () => {
    setPreviousMonthsNV(nvBalance)
    setShowNVPrompt(false)
  }

  const handleExportXlsx = async () => {
    if (!currentMonth) return
    setExporting(true)

    try {
      const blob = await exportToExcel(currentMonth, settings, previousMonthsNV)
      const filename = getFilename(settings, currentMonth, 'xlsx')

      if (isDesktop) {
        const savePath = await invokeTauri<string | null>('show_save_dialog', {
          defaultName: filename,
          filterName: 'Excel',
          filterExtensions: ['xlsx'],
        })
        if (savePath) {
          const data = Array.from(new Uint8Array(await blob.arrayBuffer()))
          await invokeTauri('save_file', { path: savePath, data })
        }
      } else {
        downloadBlob(blob, filename)
      }

      calculateAndPromptNV()
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = async () => {
    if (!currentMonth || !isDesktop) return
    setExporting(true)

    try {
      const blob = await exportToExcel(currentMonth, settings, previousMonthsNV)
      const xlsxFilename = getFilename(settings, currentMonth, 'xlsx')

      // Save XLSX to temp location
      const tmpPath = await invokeTauri<string>('get_temp_path', { filename: xlsxFilename })
      const data = Array.from(new Uint8Array(await blob.arrayBuffer()))
      await invokeTauri('save_file', { path: tmpPath, data })

      // Convert to PDF via LibreOffice
      const pdfPath = await invokeTauri<string>('convert_to_pdf', { xlsxPath: tmpPath })

      // Let user choose where to save the PDF
      const pdfFilename = getFilename(settings, currentMonth, 'pdf')
      const savePath = await invokeTauri<string | null>('show_save_dialog', {
        defaultName: pdfFilename,
        filterName: 'PDF',
        filterExtensions: ['pdf'],
      })

      if (savePath) {
        await invokeTauri('copy_file', { source: pdfPath, destination: savePath })
      }

      calculateAndPromptNV()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      alert(`Chyba při exportu PDF: ${message}`)
    } finally {
      setExporting(false)
    }
  }

  if (!currentMonth) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleExportXlsx} className="flex-1" disabled={exporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export XLSX
          </Button>
          {isDesktop && libreOfficeAvailable && (
            <Button onClick={handleExportPdf} className="flex-1" disabled={exporting}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(SLACK_DM_URL, '_blank')}
          >
            <Send className="mr-2 h-4 w-4" />
            Otevřít Slack od Jany
          </Button>
        </div>
        {isDesktop && !libreOfficeAvailable && (
          <p className="text-xs text-muted-foreground mt-2">
            Pro export PDF nainstalujte LibreOffice: brew install --cask libreoffice
          </p>
        )}
      </CardContent>

      <Dialog open={showNVPrompt} onOpenChange={setShowNVPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uložit NV hodiny</DialogTitle>
            <DialogDescription>
              Chcete uložit zůstatek náhradního volna pro příští měsíc?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-2xl font-bold">{nvBalance} hod</p>
            <p className="text-center text-sm text-muted-foreground mt-1">
              Nový zůstatek NV
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNVPrompt(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveNV}>
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
