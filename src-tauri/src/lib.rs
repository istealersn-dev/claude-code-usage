use std::collections::HashMap;
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

// ── Stats-cache data types ────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct StatsCache {
    #[serde(rename = "dailyModelTokens", default)]
    daily_model_tokens: Vec<DailyModelTokens>,
    #[serde(rename = "modelUsage", default)]
    model_usage: HashMap<String, ModelUsageEntry>,
    #[serde(rename = "totalSessions", default)]
    total_sessions: u64,
}

#[derive(serde::Deserialize)]
struct DailyModelTokens {
    date: String,
    #[serde(rename = "tokensByModel", default)]
    tokens_by_model: HashMap<String, u64>,
}

#[derive(serde::Deserialize)]
struct ModelUsageEntry {
    #[serde(rename = "inputTokens", default)]
    input_tokens: u64,
    #[serde(rename = "outputTokens", default)]
    output_tokens: u64,
    #[serde(rename = "cacheReadInputTokens", default)]
    cache_read_tokens: u64,
    #[serde(rename = "cacheCreationInputTokens", default)]
    cache_creation_tokens: u64,
}

// ── IPC return types ──────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct DailyUsage {
    date: String,
    input_tokens: u64,
    output_tokens: u64,
    cache_tokens: u64,
}

#[derive(serde::Serialize)]
pub struct ModelStat {
    name: String,
    input_tokens: u64,
    output_tokens: u64,
    cache_tokens: u64,
}

#[derive(serde::Serialize)]
pub struct ClaudeStats {
    daily_usage: Vec<DailyUsage>,
    model_stats: Vec<ModelStat>,
    total_sessions: u64,
}

// ── IPC command ───────────────────────────────────────────────────────────────

/// Reads ~/.claude/stats-cache.json and returns structured usage data.
/// Returns Err if the file is missing or cannot be parsed — the frontend
/// falls back to mock data on error.
#[tauri::command]
fn get_claude_stats() -> Result<ClaudeStats, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let path = std::path::Path::new(&home)
        .join(".claude")
        .join("stats-cache.json");

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("stats-cache.json: {}", e))?;

    let cache: StatsCache =
        serde_json::from_str(&content).map_err(|e| format!("parse error: {}", e))?;

    // Compute cumulative input/output/cache fractions from modelUsage.
    // These are used to split each day's total into the three token types.
    let (cum_input, cum_output, cum_cache) = cache.model_usage.values().fold(
        (0u64, 0u64, 0u64),
        |(i, o, c), m| {
            (
                i + m.input_tokens,
                o + m.output_tokens,
                c + m.cache_read_tokens + m.cache_creation_tokens,
            )
        },
    );
    let cum_total = cum_input + cum_output + cum_cache;

    // Build daily usage entries — keep the last 30 days.
    let mut entries: Vec<DailyUsage> = cache
        .daily_model_tokens
        .iter()
        .map(|day| {
            let total: u64 = day.tokens_by_model.values().sum();
            let (inp, out, cac) = if cum_total > 0 {
                let inp = ((total as u128 * cum_input as u128) / cum_total as u128) as u64;
                let out = ((total as u128 * cum_output as u128) / cum_total as u128) as u64;
                let cac = total - inp - out;
                (inp, out, cac)
            } else {
                (total, 0, 0)
            };
            DailyUsage {
                date: format_date_label(&day.date),
                input_tokens: inp,
                output_tokens: out,
                cache_tokens: cac,
            }
        })
        .collect();

    if entries.len() > 30 {
        entries = entries.split_off(entries.len() - 30);
    }

    // Build model stats sorted by total token count descending.
    let mut model_stats: Vec<ModelStat> = cache
        .model_usage
        .into_iter()
        .map(|(name, m)| ModelStat {
            name,
            input_tokens: m.input_tokens,
            output_tokens: m.output_tokens,
            cache_tokens: m.cache_read_tokens + m.cache_creation_tokens,
        })
        .collect();

    model_stats.sort_by(|a, b| {
        let ta = a.input_tokens + a.output_tokens + a.cache_tokens;
        let tb = b.input_tokens + b.output_tokens + b.cache_tokens;
        tb.cmp(&ta)
    });

    Ok(ClaudeStats {
        daily_usage: entries,
        model_stats,
        total_sessions: cache.total_sessions,
    })
}

/// Converts "2026-03-06" → "Mar 06" for chart axis labels.
fn format_date_label(date: &str) -> String {
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let mut parts = date.splitn(3, '-');
    let _year = parts.next();
    let month = parts.next()
        .and_then(|m| m.parse::<usize>().ok())
        .map(|m| m.saturating_sub(1));
    let day = parts.next().unwrap_or("??");
    match month.and_then(|m| months.get(m)) {
        Some(name) => format!("{} {}", name, day),
        None => date.to_string(),
    }
}

// ── App entry point ───────────────────────────────────────────────────────────

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
        .invoke_handler(tauri::generate_handler![get_claude_stats])
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
                    // neither layer renders an opaque background. setOpaque:false
                    // on NSWindow tells the compositor the window has transparent
                    // pixels; setBackgroundColor:clearColor removes the default fill.
                    if let Some(ns_color_cls) = objc2::runtime::AnyClass::get(c"NSColor") {
                        let clear: *mut AnyObject = msg_send![ns_color_cls, clearColor];
                        let _: () = msg_send![wkwebview, setBackgroundColor: clear];
                        let _: () = msg_send![ns_window, setOpaque: false];
                        let _: () = msg_send![ns_window, setBackgroundColor: clear];
                    }
                });
            }

            // Load the dedicated tray icon from the bundled PNG bytes.
            // Falls back to the default window icon if the file is missing.
            let tray_icon = {
                let bytes = include_bytes!("../icons/tray-icon.png");
                tauri::image::Image::from_bytes(bytes)
                    .ok()
                    .or_else(|| app.default_window_icon().cloned())
                    .ok_or("tray icon not found")?
            };

            let last_shown_tray = last_shown.clone();
            let pending_show_tray = pending_show.clone();
            let tray = TrayIconBuilder::new()
                .icon(tray_icon)
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

                        if window.is_visible().unwrap_or(false)
                            || pending_show_tray.load(Ordering::Acquire)
                        {
                            // Atomically cancel any in-flight show task by clearing
                            // the flag. The task checks the flag via swap() before
                            // calling show(), so it will no-op if we got here first.
                            pending_show_tray.store(false, Ordering::Release);
                            let _ = window.hide();
                        } else {
                            // Position window directly below the tray icon only when
                            // showing — avoids a visual snap on hide and skips the
                            // current_monitor() call on every hide click.
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
                                // swap() atomically reads-and-clears the flag.
                                // If it was already cleared by a hide click, skip show().
                                if pending_show_task.swap(false, Ordering::AcqRel) {
                                    let _ = window_clone.show();
                                    let _ = window_clone.set_focus();
                                }
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
                // Only hide the tray popup (main window), not any report windows.
                if window.label() != "main" {
                    return;
                }
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
