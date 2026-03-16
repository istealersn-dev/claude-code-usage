//! Binary entry point for AI Pulse. All application logic lives in `lib.rs`.
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ai_pulse_lib::run();
}
