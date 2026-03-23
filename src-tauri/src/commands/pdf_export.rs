use std::path::Path;
use std::process::Command;

const SOFFICE_PATHS: &[&str] = &[
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/local/bin/soffice",
    "/usr/bin/soffice",
];

fn find_soffice() -> Option<String> {
    // Check common paths first
    for path in SOFFICE_PATHS {
        if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    // Try PATH
    Command::new("which")
        .arg("soffice")
        .output()
        .ok()
        .and_then(|out| {
            if out.status.success() {
                String::from_utf8(out.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
}

#[tauri::command]
pub fn check_libreoffice() -> Result<bool, String> {
    Ok(find_soffice().is_some())
}

#[tauri::command]
pub fn convert_to_pdf(xlsx_path: String) -> Result<String, String> {
    let soffice = find_soffice()
        .ok_or_else(|| "LibreOffice není nainstalován. Nainstalujte ho příkazem: brew install --cask libreoffice".to_string())?;

    let xlsx = Path::new(&xlsx_path);
    let output_dir = xlsx
        .parent()
        .ok_or("Nelze určit výstupní složku")?
        .to_string_lossy()
        .to_string();

    let result = Command::new(&soffice)
        .args([
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            &output_dir,
            &xlsx_path,
        ])
        .output()
        .map_err(|e| format!("Chyba při spuštění LibreOffice: {}", e))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!("LibreOffice konverze selhala: {}", stderr));
    }

    // Return the PDF path (same name, .pdf extension)
    let pdf_path = xlsx.with_extension("pdf");
    if pdf_path.exists() {
        Ok(pdf_path.to_string_lossy().to_string())
    } else {
        Err("PDF soubor nebyl vytvořen".to_string())
    }
}
