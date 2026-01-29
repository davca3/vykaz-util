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
import { exportToExcel, exportToPdfViaServer, getFilename } from '@/lib/export'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

export function ExportButtons() {
  const { currentMonth, settings, previousMonthsNV, setPreviousMonthsNV } = useTimesheetStore()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [showNVPrompt, setShowNVPrompt] = useState(false)
  const [nvBalance, setNvBalance] = useState(0)

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

    const blob = await exportToExcel(currentMonth, settings, previousMonthsNV)
    const filename = getFilename(settings, currentMonth, 'xlsx')

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    calculateAndPromptNV()
  }

  const handleExportPdf = async () => {
    if (!currentMonth) return

    setPdfLoading(true)
    setPdfError(null)

    try {
      const blob = await exportToPdfViaServer(currentMonth, settings, previousMonthsNV)
      const filename = getFilename(settings, currentMonth, 'pdf')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      calculateAndPromptNV()
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'Chyba při exportu PDF')
    } finally {
      setPdfLoading(false)
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
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={handleExportXlsx} className="flex-1">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export XLSX
          </Button>
          <Button
            onClick={handleExportPdf}
            variant="secondary"
            className="flex-1"
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {pdfLoading ? 'Generuji PDF...' : 'Export PDF'}
          </Button>
        </div>
        {pdfError && (
          <p className="text-sm text-red-600">
            {pdfError}
            {pdfError.includes('LibreOffice') && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Pro export PDF je potřeba nainstalovat LibreOffice na serveru.
              </span>
            )}
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
