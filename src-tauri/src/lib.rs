use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use tauri::{Manager, tray::TrayIconBuilder};

/// Width of the menubar popup window in logical pixels — must match `tauri.conf.json`.
const WIN_WIDTH_PX: f64 = 440.0;

/// How long after show() to ignore focus-lost events (ms).
/// macOS fires a spurious Focused(false) during the tray-click sequence
/// before focus fully settles on the webview.
const FOCUS_SETTLE_MS: u128 = 800;

/// Runs the Tauri application. Called from main.rs.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Monotonic timestamp of the last window show(). Used by the focus-lost
    // handler to suppress the spurious Focused(false) macOS fires during the
    // tray-click sequence before focus fully settles on the webview.
    let last_shown: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));
    let last_shown_event = last_shown.clone();

    // Guards the 50 ms show-delay window. is_visible() returns false during
    // those 50 ms, so without this flag a second click would spawn a second
    // show() task instead of hiding the window as the user expects.
    let pending_show: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Force the WKWebView and NSWindow to be fully transparent.
            // Despite transparent:true in config, macOS can still render a dark
            // rounded rectangle behind the WebView.
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.with_webview(|wv| unsafe {
                    use objc2::runtime::AnyObject;
                    use objc2::msg_send;

                    let wkwebview = wv.inner() as *mut AnyObject;
                    let ns_window = wv.ns_window() as *mut AnyObject;

                    let _: () = msg_send![wkwebview, setOpaque: false];

                    // Use [NSColor clearColor] for both WKWebView and NSWindow so
                    // neither layer renders an opaque background.
                    if let Some(ns_color_cls) = objc2::runtime::AnyClass::get(c"NSColor") {
                        let clear: *mut AnyObject = msg_send![ns_color_cls, clearColor];
                        let _: () = msg_send![wkwebview, setBackgroundColor: clear];
                        let _: () = msg_send![ns_window, setBackgroundColor: clear];
                    }
                });
            }

            let icon = app
                .default_window_icon()
                .ok_or("default window icon not found")?
                .clone();

            let last_shown_tray = last_shown.clone();
            let pending_show_tray = pending_show.clone();
            let tray = TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .on_tray_icon_event(move |tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        rect,
                        ..
                    } = event {
                        let app_handle = tray.app_handle();
                        let Some(window) = app_handle.get_webview_window("main") else { return };

                        // Position window directly below the tray icon using the
                        // icon's physical rect from the click event — avoids reading
                        // outer_position() which returns stale coords on hidden windows.
                        let scale = window.scale_factor().unwrap_or(1.0);
                        let pos = rect.position.to_physical::<i32>(scale);
                        let size = rect.size.to_physical::<u32>(scale);
                        let win_w = (WIN_WIDTH_PX * scale) as i32;
                        let screen_w = window
                            .current_monitor()
                            .ok()
                            .flatten()
                            .map(|m| m.size().width as i32)
                            .unwrap_or(i32::MAX);
                        let x = (pos.x + (size.width as i32) / 2 - win_w / 2)
                            .max(0)
                            .min(screen_w - win_w);
                        let y = pos.y + size.height as i32 + (8.0 * scale) as i32;
                        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));

                        if window.is_visible().unwrap_or(false)
                            || pending_show_tray.load(Ordering::Acquire)
                        {
                            // Hide immediately; if a show task is in-flight, clear
                            // the flag so the task's show() still fires but the
                            // window is hidden again by the focus-lost handler.
                            pending_show_tray.store(false, Ordering::Release);
                            let _ = window.hide();
                        } else {
                            pending_show_tray.store(true, Ordering::Release);
                            // Record show time before revealing the window so the
                            // debounce below covers the full macOS focus-settle cycle.
                            if let Ok(mut guard) = last_shown_tray.lock() {
                                *guard = Some(Instant::now());
                            }
                            // Delay show by 50ms to let the WebView composite its
                            // first frame before the window becomes visible,
                            // eliminating the transparent-flash glitch.
                            let window_clone = window.clone();
                            let pending_show_task = pending_show_tray.clone();
                            tauri::async_runtime::spawn(async move {
                                tokio::time::sleep(Duration::from_millis(50)).await;
                                pending_show_task.store(false, Ordering::Release);
                                let _ = window_clone.show();
                                let _ = window_clone.set_focus();
                            });
                        }
                    }
                })
                .build(app)?;

            app.manage(tray);
            Ok(())
        })
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                let elapsed_ms = last_shown_event
                    .lock()
                    .ok()
                    .and_then(|guard| guard.as_ref().map(|t| t.elapsed().as_millis()))
                    .unwrap_or(u128::MAX);
                if elapsed_ms > FOCUS_SETTLE_MS {
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
