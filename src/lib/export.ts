'use client'

import ExcelJS from 'exceljs'
import { MonthData, UserSettings } from '@/types'

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
        sheet.getCell(row, 2).value = '6.00'  // Example start
        sheet.getCell(row, 4).value = `${6 + day.workedHours}.00`
        sheet.getCell(row, 8).value = day.workedHours
      }
      continue
    }

    // Regular work day
    if (day.workedHours > 0) {
      // Standard work times (can be customized)
      sheet.getCell(row, 2).value = '6.00'  // Col B: od
      const endHour = 6 + day.workedHours + 0.5 // +0.5 for lunch break
      sheet.getCell(row, 4).value = `${Math.floor(endHour)}.${(endHour % 1) * 60 || '00'}` // Col D: do

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

  // NV z minulých měsíců - need to find where this goes in template
  // Based on template analysis, Row 60+ has NV section
  // For now, the formulas in the template should auto-calculate sums

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
