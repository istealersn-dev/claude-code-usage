//! Tauri build script — runs `tauri_build::build()` to generate capability schemas and
//! inject platform-specific linker flags required by the Tauri framework.
fn main() {
    tauri_build::build();
}
