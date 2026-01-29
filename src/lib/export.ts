'use client'

import ExcelJS from 'exceljs'
import { MonthData, UserSettings } from '@/types'
import { getWorkingDaysInMonth, getHolidaysInMonth } from '@/lib/holidays'

const DEFAULT_START_TIME = '6:00'

/**
 * Parse time string (e.g., "6:00" or "6.00") to decimal hours
 */
function parseTimeToDecimal(time: string): number {
  const normalized = time.replace('.', ':')
  const [hours, minutes] = normalized.split(':').map(Number)
  return hours + (minutes || 0) / 60
}

/**
 * Format decimal hours to time string for Excel (e.g., 14.5 -> "14.30")
 */
function formatDecimalToTime(decimal: number): string {
  const hours = Math.floor(decimal)
  const minutes = Math.round((decimal - hours) * 60)
  return `${hours}.${minutes.toString().padStart(2, '0')}`
}

/**
 * Export to Excel using the original template.
 * Only fills in values, preserves all formatting and formulas.
 */
export async function exportToExcel(
  monthData: MonthData,
  settings: UserSettings,
  previousMonthsNV: number
): Promise<Blob> {
  // Load the template
  const response = await fetch('/template.xlsx')
  const arrayBuffer = await response.arrayBuffer()

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const sheet = workbook.worksheets[0]

  // Fill employee info (Row 2)
  // A2 is merged - contains "Příjmení a jméno: "
  const fullName = `${settings.lastName} ${settings.firstName}`.trim()
  sheet.getCell('A2').value = `Příjmení a jméno: ${fullName || 'Neuvedeno'}`

  // L2 is merged - contains "Číslo zaměstnance: "
  sheet.getCell('L2').value = `Číslo zaměstnance: ${settings.employeeNumber || ''}`

  // Fill period (Row 3) - L3 has formula, replace with text
  sheet.getCell('L3').value = `Období(měsíc/rok) ${monthData.month}/${monthData.year}`

  // Fill days (Rows 8-38 for days 1-31)
  const DATA_START_ROW = 8

  for (const day of monthData.days) {
    const row = DATA_START_ROW + day.dayOfMonth - 1

    // Skip if row doesn't exist (months with < 31 days handled by template)
    if (row > 38) continue

    // Use day's own start time (can be overridden per day)
    const startTimeDecimal = parseTimeToDecimal(day.startTime || DEFAULT_START_TIME)

    // Column mapping based on template:
    // A = Day number (already filled)
    // B-D = Pracováno od-do (work time range)
    // E-G = Prac.přestávka (auto-calculated in template)
    // H = Celkem odprac. vč.přesč. hod.
    // I = Čerpání NV hod.(−) z min.měs.
    // J = Přesčas.hod. v tomto měs. na NV (auto-calculated)
    // K = Přesčas.hod. v tomto měs. k proplac.
    // L = Propustky hod.
    // M = Přerušení prac.doby od-do
    // N = Důvod přerušení prac.doby

    if (day.isWeekend) {
      // Weekend - leave mostly empty, template handles it
      sheet.getCell(row, 3).value = '-' // Column C
      sheet.getCell(row, 6).value = '-' // Column F
      continue
    }

    if (day.isHoliday || day.interruptionType === 'Sv') {
      // Holiday
      sheet.getCell(row, 3).value = 'Sv'
      continue
    }

    // Handle interruption types
    const intType = String(day.interruptionType)
    if (intType.length > 0) {
      sheet.getCell(row, 3).value = intType

      // For vacation with partial hours
      if (intType === 'D' && day.vacationHours > 0 && day.workedHours > 0) {
        // Partial vacation - still worked some hours
        const startTime = formatDecimalToTime(startTimeDecimal)
        const endTime = formatDecimalToTime(startTimeDecimal + day.workedHours)
        sheet.getCell(row, 2).value = startTime
        sheet.getCell(row, 4).value = endTime
        sheet.getCell(row, 8).value = day.workedHours
      }
      continue
    }

    // Regular work day
    if (day.workedHours > 0) {
      // Use configured start time
      const startTime = formatDecimalToTime(startTimeDecimal)
      const endHour = startTimeDecimal + day.workedHours + 0.5 // +0.5 for lunch break
      const endTime = formatDecimalToTime(endHour)

      sheet.getCell(row, 2).value = startTime  // Col B: od
      sheet.getCell(row, 4).value = endTime    // Col D: do

      // Total worked hours (Col H)
      sheet.getCell(row, 8).value = day.workedHours
    }

    // Čerpání NV (Col I)
    if (day.compensatoryLeaveHours > 0) {
      sheet.getCell(row, 9).value = day.compensatoryLeaveHours
    }

    // Přesčas k proplacení (Col K) - J is auto-calculated
    if (day.overtimeToPayHours > 0) {
      sheet.getCell(row, 11).value = day.overtimeToPayHours
    }

    // Propustky (Col L)
    if (day.passHours > 0) {
      sheet.getCell(row, 12).value = day.passHours
    }

    // Přerušení pracovní doby od-do (Col M)
    if (day.passFrom && day.passTo) {
      sheet.getCell(row, 13).value = `${day.passFrom}-${day.passTo}`
    }

    // Důvod přerušení (Col N)
    if (day.passReason) {
      sheet.getCell(row, 14).value = day.passReason
    }
  }

  // Summary sections use formulas in template, only fill input values
  const workingDays = getWorkingDaysInMonth(monthData.year, monthData.month)
  sheet.getCell('N54').value = workingDays // Pracovní dny bez svátků pro FPD
  sheet.getCell('K61').value = previousMonthsNV // Zůstatek NV hod z minulých měsíců

  // Add signature image if available (find appropriate position)
  if (settings.signatureImage) {
    try {
      const base64Data = settings.signatureImage.split(',')[1]
      const imageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      })
      // Position near signature area (approximately row 63)
      sheet.addImage(imageId, {
        tl: { col: 4, row: 62 },
        ext: { width: 120, height: 40 }
      })
    } catch (e) {
      console.error('Failed to add signature:', e)
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function getFilename(settings: UserSettings, monthData: MonthData, extension: string): string {
  const monthStr = monthData.month.toString().padStart(2, '0')
  const yearStr = monthData.year.toString().slice(-2)
  const base = settings.lastName || 'vykaz'
  return `${base}_${monthStr}${yearStr}.${extension}`
}

/**
 * Export to PDF by converting the filled XLSX template via server-side LibreOffice
 */
export async function exportToPdfViaServer(
  monthData: MonthData,
  settings: UserSettings,
  previousMonthsNV: number
): Promise<Blob> {
  // First, generate the filled XLSX
  const xlsxBlob = await exportToExcel(monthData, settings, previousMonthsNV)

  // Send to server for conversion
  const formData = new FormData()
  formData.append('file', xlsxBlob, 'vykaz.xlsx')

  const response = await fetch('/api/convert-pdf', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to convert to PDF')
  }

  return response.blob()
}

/**
 * Export to PDF matching the Excel template structure exactly
 */
export async function exportToPdf(
  monthData: MonthData,
  settings: UserSettings,
  previousMonthsNV: number
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // A4 landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = 297
  const pageHeight = 210
  const margin = 5

  const fullName = `${settings.lastName} ${settings.firstName}`.trim()

  // === ROW 1: Title ===
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('EVIDENCE PRACOVNÍ DOBY', pageWidth / 2, 8, { align: 'center' })

  // === ROW 2: Employee info ===
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Příjmení a jméno: ${fullName || ''}`, margin, 14)
  doc.text(`Číslo zaměstnance: ${settings.employeeNumber || ''}`, 180, 14)

  // === ROW 3: Period and work hours ===
  doc.text(`Úvazek: 8 hod`, margin, 19)
  doc.text(`Pracovní přestávka: 30 min`, 60, 19)
  doc.text(`Období (měsíc/rok): ${monthData.month}/${monthData.year}`, 180, 19)

  // === Main data table (rows 4-38 in template) ===
  // Prepare table data matching template columns exactly
  const tableData = monthData.days.map(day => {
    const startTimeDecimal = parseTimeToDecimal(day.startTime || DEFAULT_START_TIME)

    let col2 = '' // od (start time)
    let col3 = '' // type marker (in middle of od-do)
    let col4 = '' // do (end time)
    let col6 = '' // break start
    let col7 = '' // break end
    let col8: string | number = '' // total worked
    let col9: string | number = '' // čerpání NV
    let col10: string | number = '' // přesčas na NV
    let col11: string | number = '' // přesčas k proplacení
    let col12: string | number = '' // propustky
    let col13 = '' // přerušení od-do
    let col14 = '' // důvod

    if (day.isWeekend) {
      col3 = '-'
      col6 = '-'
    } else if (day.isHoliday || day.interruptionType === 'Sv') {
      col3 = 'Sv'
    } else if (day.interruptionType) {
      col3 = day.interruptionType
      if (day.interruptionType === 'D' && day.workedHours > 0) {
        col2 = formatDecimalToTime(startTimeDecimal)
        col4 = formatDecimalToTime(startTimeDecimal + day.workedHours)
        col8 = day.workedHours
      }
    } else if (day.workedHours > 0) {
      // Regular work day
      col2 = formatDecimalToTime(startTimeDecimal)
      const endHour = startTimeDecimal + day.workedHours + 0.5
      col4 = formatDecimalToTime(endHour)
      col6 = formatDecimalToTime(startTimeDecimal + 4) // break after 4h
      col7 = formatDecimalToTime(startTimeDecimal + 4.5)
      col8 = day.workedHours
    }

    if (day.compensatoryLeaveHours > 0) col9 = day.compensatoryLeaveHours
    if (day.overtimeHours > 0) col10 = day.overtimeHours
    if (day.overtimeToPayHours > 0) col11 = day.overtimeToPayHours
    if (day.passHours > 0) col12 = day.passHours
    if (day.passFrom && day.passTo) col13 = `${day.passFrom}-${day.passTo}`
    if (day.passReason) col14 = day.passReason

    return [
      day.dayOfMonth,
      col2, col3, col4,
      col6, col7,
      col8, col9, col10, col11, col12, col13, col14
    ]
  })

  // Add totals row
  const totalsRow = [
    'Celkem',
    '', '', '',
    '', '',
    monthData.totalWorkedHours,
    monthData.totalCompensatoryLeaveHours || '',
    monthData.totalOvertimeHours - monthData.totalOvertimeToPayHours || '',
    monthData.totalOvertimeToPayHours || '',
    monthData.totalPassHours || '',
    '', ''
  ]
  tableData.push(totalsRow)

  // Column headers matching template exactly
  const headers = [
    [
      { content: 'Den', rowSpan: 4 },
      { content: 'Pracováno', colSpan: 3 },
      { content: 'Prac.přestávka', colSpan: 2 },
      { content: 'Celkem\nodprac.\nvč.přesč.\nhod.', rowSpan: 4 },
      { content: 'Čerpání NV\nhod.(-)\nz min.měs.\nk proplac.', rowSpan: 4 },
      { content: 'Přesčas.hod.\nv tomto měs.\nna NV do\ndalš.měsíců', rowSpan: 4 },
      { content: 'Přesčas.hod.\nv tomto měs.\n\nk proplac.', rowSpan: 4 },
      { content: 'Propustky\nhod.\n\nlékař,krev...', rowSpan: 4 },
      { content: 'Přerušení\nprac.doby\n\nod-do', rowSpan: 4 },
      { content: 'Důvod přerušení\nprac.doby\n\n(služ.cesta,lékař..)', rowSpan: 4 },
    ],
    [
      { content: 'od-do', colSpan: 3 },
      { content: 'od-do', colSpan: 2 },
    ],
  ]

  autoTable(doc, {
    startY: 23,
    head: headers,
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      valign: 'middle',
      halign: 'center',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 5,
      fontStyle: 'normal',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 12,
    },
    columnStyles: {
      0: { cellWidth: 7 },    // Den
      1: { cellWidth: 11 },   // od
      2: { cellWidth: 8 },    // typ
      3: { cellWidth: 11 },   // do
      4: { cellWidth: 11 },   // přest. od
      5: { cellWidth: 11 },   // přest. do
      6: { cellWidth: 12 },   // celkem
      7: { cellWidth: 14 },   // čerpání NV
      8: { cellWidth: 14 },   // přesčas NV
      9: { cellWidth: 14 },   // přesčas propl
      10: { cellWidth: 12 },  // propustky
      11: { cellWidth: 18 },  // přerušení od-do
      12: { cellWidth: 28 },  // důvod
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.row.index < monthData.days.length) {
        const day = monthData.days[data.row.index]
        if (day.isWeekend) {
          data.cell.styles.fillColor = [230, 230, 230]
        } else if (day.isHoliday) {
          data.cell.styles.fillColor = [255, 255, 200]
        }
      }
      // Bold totals row
      if (data.section === 'body' && data.row.index === monthData.days.length) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      }
    }
  })

  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // === Summary section (matching template rows 41-55) ===
  let y = tableEndY + 4
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')

  // Left column - worked hours summary
  const leftX = margin
  doc.text('Odpracováno v tomto měsíci:', leftX, y)
  doc.text(`Odpracované hodiny bez přesčasů: ${monthData.totalWorkedHours - monthData.totalOvertimeHours} hod.`, leftX, y + 4)
  doc.text(`Odpracované přesčas.hod. v tomto měs. na NV: ${monthData.totalOvertimeHours - monthData.totalOvertimeToPayHours} hod.`, leftX, y + 8)
  doc.text(`Odpracované přesčas.hod. v tomto měs. k propl.: ${monthData.totalOvertimeToPayHours} hod.`, leftX, y + 12)
  doc.text(`Celkem odpracováno v tomto měsíci: ${monthData.totalWorkedHours} hod.`, leftX, y + 16)

  // Middle column - to pay
  const midX = 100
  doc.text('Hodiny k proplacení:', midX, y)
  doc.text(`Odprac.hod. v tomto měs. bez přesčasu: ${monthData.totalWorkedHours - monthData.totalOvertimeHours} hod.`, midX, y + 4)
  doc.text(`Čerpání NV hod. k proplacení: ${monthData.totalCompensatoryLeaveHours} hod.`, midX, y + 8)
  doc.text(`Přesčas.hodiny odprac. v tomto měs. k propl.: ${monthData.totalOvertimeToPayHours} hod.`, midX, y + 12)

  const totalToPay = (monthData.totalWorkedHours - monthData.totalOvertimeHours) + monthData.totalCompensatoryLeaveHours + monthData.totalOvertimeToPayHours
  doc.setFont('helvetica', 'bold')
  doc.text(`CELKEM odprac.hod. k proplacení: ${totalToPay} hod.`, midX, y + 16)
  doc.setFont('helvetica', 'normal')

  // Right column - legend
  const rightX = 200
  doc.text('Legenda:', rightX, y)
  doc.text('Sv - svátek', rightX, y + 4)
  doc.text('D - dovolená', rightX, y + 8)
  doc.text('N - nemocenská', rightX, y + 12)
  doc.text('Oš - ošetřování člena rodiny', rightX, y + 16)
  doc.text('NV - náhradní volno celý den', rightX, y + 20)
  doc.text('P - překážky v práci (lékař, krev...)', rightX, y + 24)
  doc.text('M - peněž.pomoc v mateřství', rightX, y + 28)
  doc.text('RD - rodičovská dovolená', rightX, y + 32)
  doc.text('NP - neplacené volno', rightX, y + 36)

  // Additional info rows
  y += 22
  doc.text(`P - Propustky (lékař, dárcovství krve...): ${monthData.totalPassHours} hod.`, leftX, y)
  doc.text(`D - Dovolená: ${monthData.totalVacationDays} dnů / ${monthData.totalVacationHours} hod.`, leftX, y + 4)
  doc.text(`Sv - Svátky: ${monthData.days.filter(d => d.isHoliday && !d.isWeekend).length} dnů`, leftX, y + 8)
  doc.text(`N - Nemoc: ${monthData.totalSickDays} dnů`, leftX, y + 12)

  // NV Section (left column)
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('NV - Náhradní volno:', leftX, y)
  doc.setFont('helvetica', 'normal')

  const overtimeToNV = monthData.totalOvertimeHours - monthData.totalOvertimeToPayHours
  const nvBalance = previousMonthsNV + overtimeToNV - monthData.totalCompensatoryLeaveHours

  doc.text(`Zůstatek hod.NV z min.měsíců (+): ${previousMonthsNV} hod.`, leftX, y + 4)
  doc.text(`Čerpání hod.NV k proplacení z min.měsíců (-): ${monthData.totalCompensatoryLeaveHours} hod.`, leftX, y + 8)
  doc.text(`Přesčas.hod.odprac.v tomto měs. na NV (+): ${overtimeToNV} hod.`, leftX, y + 12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Zůstatek hod. NV do dalších měsíců: ${nvBalance} hod.`, leftX, y + 16)

  // FPD Section (middle column, same row as NV)
  const workingDays = getWorkingDaysInMonth(monthData.year, monthData.month)
  const holidaysCount = getHolidaysInMonth(monthData.year, monthData.month)
  const fondPracovniDoby = (workingDays + holidaysCount) * 8

  doc.setFont('helvetica', 'bold')
  doc.text('FPD - Fond pracovní doby:', midX, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`Pracovní dny: ${workingDays}`, midX, y + 4)
  doc.text(`Svátky (pracovní dny): ${holidaysCount}`, midX, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.text(`FPD celkem: ${fondPracovniDoby} hod.`, midX, y + 12)

  // Signature section
  y += 24
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Podpis zaměstnance: ..........................................', leftX, y)
  doc.text('Podpis vedoucího: ..........................................', midX + 20, y)

  // Add signature image if available
  if (settings.signatureImage) {
    try {
      doc.addImage(settings.signatureImage, 'PNG', leftX + 35, y - 8, 40, 12)
    } catch (e) {
      console.error('Failed to add signature:', e)
    }
  }

  return doc.output('blob')
}
