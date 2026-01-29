import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Python script that uses UNO to open file, recalculate formulas, and export to PDF
const pythonScript = `
import sys
import uno
from com.sun.star.beans import PropertyValue

def convert_to_pdf(input_path, output_path):
    # Connect to LibreOffice
    local_context = uno.getComponentContext()
    resolver = local_context.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_context)

    try:
        ctx = resolver.resolve(
            "uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext")
    except:
        # If no running instance, we need to start one
        print("ERROR: LibreOffice not running in listening mode", file=sys.stderr)
        sys.exit(1)

    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)

    # Open the file
    url = uno.systemPathToFileUrl(input_path)
    doc = desktop.loadComponentFromURL(url, "_blank", 0, ())

    # Force recalculation of all formulas
    doc.calculateAll()

    # Export to PDF
    pdf_filter = PropertyValue()
    pdf_filter.Name = "FilterName"
    pdf_filter.Value = "calc_pdf_Export"

    output_url = uno.systemPathToFileUrl(output_path)
    doc.storeToURL(output_url, (pdf_filter,))

    doc.close(True)
    print("OK")

if __name__ == "__main__":
    convert_to_pdf(sys.argv[1], sys.argv[2])
`

export async function POST(request: NextRequest) {
  const tempDir = join(tmpdir(), 'vykaz-convert')
  const timestamp = Date.now()
  const inputPath = join(tempDir, `input-${timestamp}.xlsx`)
  const outputPath = join(tempDir, `input-${timestamp}.pdf`)
  const scriptPath = join(tempDir, `convert-${timestamp}.py`)

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

    // Try different conversion methods
    let conversionSuccess = false
    let lastError = ''

    // Method 1: Try simple LibreOffice conversion with macro to recalculate
    const libreOfficePaths = [
      'libreoffice',
      'soffice',
      '/usr/bin/libreoffice',
      '/usr/bin/soffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    ]

    for (const loPath of libreOfficePaths) {
      try {
        // Use macro to recalculate before converting
        // The "macro:///Standard.Module1.RecalcAndExport" approach requires setup
        // Instead, use infilter with RecalcOnLoad option
        const command = `"${loPath}" --headless --infilter="Microsoft Excel 2007-2019 XML:59" --convert-to pdf:calc_pdf_Export --outdir "${tempDir}" "${inputPath}"`
        await execAsync(command, { timeout: 60000 })
        conversionSuccess = true
        break
      } catch (e) {
        lastError = String(e)
        continue
      }
    }

    // Method 2: Fallback - try without infilter
    if (!conversionSuccess) {
      for (const loPath of libreOfficePaths) {
        try {
          const command = `"${loPath}" --headless --convert-to pdf --outdir "${tempDir}" "${inputPath}"`
          await execAsync(command, { timeout: 60000 })
          conversionSuccess = true
          break
        } catch (e) {
          lastError = String(e)
          continue
        }
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
    try { await unlink(scriptPath) } catch {}

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
    try { await unlink(scriptPath) } catch {}

    console.error('PDF conversion error:', error)
    return NextResponse.json({
      error: 'Failed to convert to PDF',
      details: String(error)
    }, { status: 500 })
  }
}
