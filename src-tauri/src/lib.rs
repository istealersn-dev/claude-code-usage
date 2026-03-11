use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{Manager, tray::TrayIconBuilder};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Runs the Tauri application. Called from main.rs.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Timestamp of the last window show(). The focus-lost handler uses this to
    // ignore the spurious Focused(false) that macOS fires during the tray-click
    // sequence before focus fully settles on the webview.
    let last_shown: Arc<AtomicU64> = Arc::new(AtomicU64::new(0));
    let last_shown_event = last_shown.clone();

    tauri::Builder::default()
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Force the WKWebView and NSWindow to be fully transparent.
            // Despite transparent:true in config, the macOS window background
            // can still render a dark rounded rectangle behind the WebView.
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.with_webview(|wv| unsafe {
                    use objc2::runtime::AnyObject;
                    use objc2::msg_send;

                    let wkwebview = wv.inner() as *mut AnyObject;
                    let ns_window = wv.ns_window() as *mut AnyObject;

                    // WKWebView: setOpaque(false) + setBackgroundColor(nil)
                    let _: () = msg_send![wkwebview, setOpaque: false];
                    let _: () = msg_send![wkwebview, setBackgroundColor: std::ptr::null::<AnyObject>()];

                    // NSWindow: setBackgroundColor([NSColor clearColor])
                    let ns_color_cls = objc2::runtime::AnyClass::get(c"NSColor").unwrap();
                    let clear: *mut AnyObject = msg_send![ns_color_cls, clearColor];
                    let _: () = msg_send![ns_window, setBackgroundColor: clear];
                });
            }

            let last_shown_tray = last_shown.clone();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .on_tray_icon_event(move |tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        rect,
                        ..
                    } = event {
                        let app_handle = tray.app_handle();
                        let window = app_handle.get_webview_window("main").unwrap();
                        // Position window directly below the tray icon using the
                        // icon's physical rect from the click event — avoids reading
                        // outer_position() which returns stale coords on hidden windows.
                        let scale = window.scale_factor().unwrap_or(1.0);
                        let pos = rect.position.to_physical::<i32>(scale);
                        let size = rect.size.to_physical::<u32>(scale);
                        let win_w = (440.0 * scale) as i32;
                        let x = pos.x + (size.width as i32) / 2 - win_w / 2;
                        let y = pos.y + size.height as i32 + (8.0 * scale) as i32;
                        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                        if window.is_visible().unwrap_or(false) {
                            window.hide().unwrap();
                        } else {
                            // Record show time before revealing the window so the
                            // 800ms debounce below covers the full macOS focus-settle
                            // cycle without needing app_handle.show().
                            last_shown_tray.store(now_ms(), Ordering::SeqCst);
                            // Delay show by 50ms to let the WebView composite its
                            // first frame before the window becomes visible,
                            // eliminating the transparent-flash glitch.
                            let window_clone = window.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(50));
                                window_clone.show().unwrap();
                                window_clone.set_focus().unwrap();
                            });
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                // Ignore focus-lost events within 800ms of the last show().
                // Removed app_handle.show() which was causing a secondary
                // Focused(false) after the debounce window expired.
                let elapsed = now_ms().saturating_sub(last_shown_event.load(Ordering::SeqCst));
                if elapsed > 800 {
                    window.hide().unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
