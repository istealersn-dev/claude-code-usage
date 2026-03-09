use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{Manager, tray::TrayIconBuilder};
use tauri_plugin_positioner::{Position, WindowExt};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Runs the Tauri application. Called from main.rs.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Tracks when the window was last shown. Used to debounce the focus-lost
    // handler — on macOS, clicking the tray icon briefly fires Focused(false)
    // during the activation transition, which would immediately hide the window.
    let last_shown: Arc<AtomicU64> = Arc::new(AtomicU64::new(0));
    let last_shown_event = last_shown.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let last_shown_tray = last_shown.clone();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .on_tray_icon_event(move |tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        let window = tray.app_handle().get_webview_window("main").unwrap();
                        let _ = window.move_window(Position::TrayCenter);
                        if window.is_visible().unwrap_or(false) {
                            window.hide().unwrap();
                        } else {
                            last_shown_tray.store(now_ms(), Ordering::Relaxed);
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                // Ignore spurious focus-lost events within 500ms of showing.
                // macOS fires Focused(false) briefly during tray-click activation.
                if now_ms().saturating_sub(last_shown_event.load(Ordering::Relaxed)) > 500 {
                    window.hide().unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
