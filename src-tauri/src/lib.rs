mod commands;

use tauri::{Emitter, Listener};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Handle deep link URLs (vykaz://import?data=...)
            let handle = app.handle().clone();
            app.handle().listen("deep-link://new-url", move |event| {
                let payload = event.payload();
                let _ = handle.emit("deep-link-import", payload);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pdf_export::check_libreoffice,
            commands::pdf_export::convert_to_pdf,
            commands::file_ops::save_file,
            commands::file_ops::copy_file,
            commands::file_ops::get_temp_path,
            commands::file_ops::show_save_dialog,
            commands::calendar::request_calendar_access,
            commands::calendar::read_vacation_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
