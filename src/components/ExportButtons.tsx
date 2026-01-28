'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { exportToExcel, getFilename } from '@/lib/export'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { getWorkingDaysInMonth, getHolidaysInMonth } from '@/lib/holidays'

export function ExportButtons() {
  const { currentMonth, settings, previousMonthsNV } = useTimesheetStore()

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
  }

  const handleExportPdf = async () => {
    if (!currentMonth) return

    // Dynamic import for jsPDF to avoid SSR issues
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const filename = getFilename(settings, currentMonth, 'pdf')

    const MONTHS = [
      'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
      'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
    ]
    const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

    // Title
    doc.setFontSize(16)
    doc.text(`PRACOVNÍ VÝKAZ - ${MONTHS[currentMonth.month - 1]} ${currentMonth.year}`, 148, 15, { align: 'center' })

    // Employee info
    doc.setFontSize(10)
    doc.text(`Zaměstnanec: ${settings.firstName} ${settings.lastName}`, 14, 25)
    doc.text(`Číslo: ${settings.employeeNumber}`, 14, 30)

    // Main table with all columns
    const tableData = currentMonth.days.map(day => [
      DAY_NAMES[day.dayOfWeek],
      `${day.dayOfMonth}.${currentMonth.month}.`,
      day.interruptionType || (day.isWeekend ? '-' : ''),
      day.workedHours || '',
      day.vacationHours || '',
      day.overtimeHours || '',
      day.overtimeToPayHours || '',
      day.compensatoryLeaveHours || '',
      day.passHours || '',
      day.passReason || '',
      day.passFrom && day.passTo ? `${day.passFrom}-${day.passTo}` : '',
    ])

    autoTable(doc, {
      startY: 35,
      head: [['Den', 'Datum', 'Typ', 'Odprac.', 'Dov.hod', 'Přesčas', 'Př.propl', 'Čerp.NV', 'Propust.', 'Důvod', 'Od-Do']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [200, 200, 200], fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 18 },
        2: { cellWidth: 15 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 18 },
        9: { cellWidth: 35 },
        10: { cellWidth: 25 },
      },
      didParseCell: function(data) {
        const day = currentMonth.days[data.row.index]
        if (day && data.section === 'body') {
          if (day.isWeekend) {
            data.cell.styles.fillColor = [240, 240, 240]
          } else if (day.isHoliday) {
            data.cell.styles.fillColor = [255, 255, 200]
          }
        }
      }
    })

    // Summary section
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

    const workingDays = getWorkingDaysInMonth(currentMonth.year, currentMonth.month)
    const holidays = getHolidaysInMonth(currentMonth.year, currentMonth.month)
    const overtimeToNV = currentMonth.totalOvertimeHours - currentMonth.totalOvertimeToPayHours
    const nvBalance = previousMonthsNV + overtimeToNV - currentMonth.totalCompensatoryLeaveHours

    doc.setFontSize(9)

    // Column 1 - Summary
    doc.setFont('helvetica', 'bold')
    doc.text('SHRNUTÍ:', 14, finalY)
    doc.setFont('helvetica', 'normal')
    doc.text(`Odpracováno: ${currentMonth.totalWorkedHours} hod`, 14, finalY + 5)
    doc.text(`Přesčas: ${currentMonth.totalOvertimeHours} hod`, 14, finalY + 10)
    doc.text(`Přesčas k propl.: ${currentMonth.totalOvertimeToPayHours} hod`, 14, finalY + 15)
    doc.text(`Čerpání NV: ${currentMonth.totalCompensatoryLeaveHours} hod`, 14, finalY + 20)
    doc.text(`Propustky: ${currentMonth.totalPassHours} hod`, 14, finalY + 25)
    doc.text(`Dovolená: ${currentMonth.totalVacationDays}d / ${currentMonth.totalVacationHours}h`, 14, finalY + 30)

    // Column 2 - FPD
    doc.setFont('helvetica', 'bold')
    doc.text('FPD:', 90, finalY)
    doc.setFont('helvetica', 'normal')
    doc.text(`Pracovní dny: ${workingDays}`, 90, finalY + 5)
    doc.text(`Svátky: ${holidays}`, 90, finalY + 10)
    doc.text(`FPD celkem: ${(workingDays + holidays) * 8} hod`, 90, finalY + 15)

    // Column 3 - NV
    doc.setFont('helvetica', 'bold')
    doc.text('NV:', 150, finalY)
    doc.setFont('helvetica', 'normal')
    doc.text(`Z minulých měs.: ${previousMonthsNV} hod`, 150, finalY + 5)
    doc.text(`+ Přesčas (do NV): ${overtimeToNV} hod`, 150, finalY + 10)
    doc.text(`- Čerpáno: ${currentMonth.totalCompensatoryLeaveHours} hod`, 150, finalY + 15)
    doc.setFont('helvetica', 'bold')
    doc.text(`NV zůstatek: ${nvBalance} hod`, 150, finalY + 20)

    // Column 4 - K proplacení
    doc.setFont('helvetica', 'bold')
    doc.text('K PROPLACENÍ:', 220, finalY)
    doc.setFont('helvetica', 'normal')
    doc.text(`Přesčas: ${currentMonth.totalOvertimeToPayHours} hod`, 220, finalY + 5)

    // Signature
    doc.setFont('helvetica', 'normal')
    doc.text('Podpis zaměstnance: ______________________', 14, finalY + 42)

    if (settings.signatureImage) {
      doc.addImage(settings.signatureImage, 'PNG', 60, finalY + 35, 40, 15)
    }

    doc.save(filename)
  }

  if (!currentMonth) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button onClick={handleExportXlsx} className="flex-1">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export XLSX
        </Button>
        <Button onClick={handleExportPdf} variant="secondary" className="flex-1">
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </CardContent>
    </Card>
  )
}
