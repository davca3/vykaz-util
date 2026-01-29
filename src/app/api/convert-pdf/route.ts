import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const tempDir = join(tmpdir(), 'vykaz-convert')
  const timestamp = Date.now()
  const inputPath = join(tempDir, `input-${timestamp}.xlsx`)
  const outputPath = join(tempDir, `input-${timestamp}.pdf`)

  try {
    // Ensure temp directory exists
    await mkdir(tempDir, { recursive: true })

    // Get the XLSX file from request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Save XLSX to temp file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(inputPath, buffer)

    // Convert using LibreOffice
    // Try different LibreOffice paths for different OS
    const libreOfficePaths = [
      'libreoffice',
      'soffice',
      '/usr/bin/libreoffice',
      '/usr/bin/soffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    ]

    let conversionSuccess = false
    let lastError = ''

    for (const loPath of libreOfficePaths) {
      try {
        const command = `"${loPath}" --headless --convert-to pdf --outdir "${tempDir}" "${inputPath}"`
        await execAsync(command, { timeout: 30000 })
        conversionSuccess = true
        break
      } catch (e) {
        lastError = String(e)
        continue
      }
    }

    if (!conversionSuccess) {
      // Cleanup
      try { await unlink(inputPath) } catch {}
      return NextResponse.json({
        error: 'LibreOffice not found. Please install LibreOffice.',
        details: lastError
      }, { status: 500 })
    }

    // Read the generated PDF
    const pdfBuffer = await readFile(outputPath)

    // Cleanup temp files
    try { await unlink(inputPath) } catch {}
    try { await unlink(outputPath) } catch {}

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="vykaz.pdf"',
      },
    })
  } catch (error) {
    // Cleanup on error
    try { await unlink(inputPath) } catch {}
    try { await unlink(outputPath) } catch {}

    console.error('PDF conversion error:', error)
    return NextResponse.json({
      error: 'Failed to convert to PDF',
      details: String(error)
    }, { status: 500 })
  }
}
