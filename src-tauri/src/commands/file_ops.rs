use std::env;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn save_file(path: String, data: Vec<u8>) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Nelze vytvořit složku: {}", e))?;
    }

    fs::write(&file_path, &data)
        .map_err(|e| format!("Nelze uložit soubor: {}", e))?;

    Ok(path)
}

#[tauri::command]
pub fn copy_file(source: String, destination: String) -> Result<String, String> {
    let dest_path = PathBuf::from(&destination);

    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Nelze vytvořit složku: {}", e))?;
    }

    fs::copy(&source, &destination)
        .map_err(|e| format!("Nelze kopírovat soubor: {}", e))?;

    Ok(destination)
}

#[tauri::command]
pub fn get_temp_path(filename: String) -> Result<String, String> {
    let tmp = env::temp_dir();
    let path = tmp.join(filename);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn show_save_dialog(
    window: tauri::Window,
    default_name: String,
    filter_name: String,
    filter_extensions: Vec<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();

    let ext_refs: Vec<&str> = filter_extensions.iter().map(|s| s.as_str()).collect();

    window
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &ext_refs)
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    rx.recv()
        .map_err(|e| format!("Dialog error: {}", e))
}
