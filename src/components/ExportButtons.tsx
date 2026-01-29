'use client'

import { useState } from 'react'
import { useTimesheetStore } from '@/store/timesheet-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { exportToExcel, exportToPdfViaServer, getFilename } from '@/lib/export'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

export function ExportButtons() {
  const { currentMonth, settings, previousMonthsNV, setPreviousMonthsNV } = useTimesheetStore()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [showNVPrompt, setShowNVPrompt] = useState(false)
  const [nvBalance, setNvBalance] = useState(0)

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

        {showNVPrompt && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <p className="text-sm font-medium">
              Uložit zůstatek NV hodin pro příští měsíc?
            </p>
            <p className="text-sm text-muted-foreground">
              Nový zůstatek: <span className="font-bold">{nvBalance} hod</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNV}>
                Ano, uložit
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNVPrompt(false)}>
                Ne
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
