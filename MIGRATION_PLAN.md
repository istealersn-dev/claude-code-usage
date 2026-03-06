# Migration Plan: Rebuilding as a Native macOS App using Tauri

This document outlines the step-by-step process for migrating the current web-based AI Pulse (formerly Claude Pulse) Usage Dashboard simulation into a native macOS Menubar application using **Tauri**. The goal is to retain the exact UI and animations while replacing the simulated environment with native OS integration.

## 1. Prerequisites & Setup

Before starting the migration, ensure you have the necessary dependencies installed for Tauri development on macOS:
- **Rust**: Install via `rustup` (https://rustup.rs/).
- **Node.js & npm/yarn/pnpm**: Already used in the current project.
- **Xcode Command Line Tools**: Run `xcode-select --install`.

## 2. Initialize Tauri in the Existing Project

Since the current project is already a Vite + React application, we can easily integrate Tauri into it.

1. **Add Tauri CLI**:
   ```bash
   npm install -D @tauri-apps/cli
   ```
2. **Initialize Tauri**:
   ```bash
   npx tauri init
   ```
   - *App name*: `AI Pulse`
   - *Window title*: `AI Pulse`
   - *Web assets*: `../dist`
   - *Dev server URL*: `http://localhost:3000` (or your Vite dev port)
   - *Frontend dev command*: `npm run dev`
   - *Frontend build command*: `npm run build`

## 3. Configure Tauri for a Menubar (Tray) App

To make the app behave like a native macOS menubar app, we need to configure the `tauri.conf.json` and the Rust backend (`src-tauri/src/main.rs`).

### Update `tauri.conf.json`
Modify the window configuration to be frameless, transparent, and hidden on startup:
```json
"tauri": {
  "windows": [
    {
      "title": "AI Pulse",
      "width": 400,
      "height": 600,
      "decorations": false,
      "transparent": true,
      "hiddenTitle": true,
      "visible": false,
      "resizable": false,
      "alwaysOnTop": true
    }
  ],
  "systemTray": {
    "iconPath": "icons/icon.png",
    "iconAsTemplate": true
  }
}
```
*(Note: `iconAsTemplate: true` ensures the icon adapts to macOS light/dark mode).*

### Update Rust Backend (`src-tauri/src/main.rs`)
Implement the system tray logic to toggle the window visibility when the tray icon is clicked. You may want to use a community plugin like `tauri-plugin-positioner` to automatically position the window under the menubar icon.

```rust
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager};
use tauri_plugin_positioner::{Position, WindowExt};

fn main() {
    let tray_menu = SystemTrayMenu::new(); // Add quit options if needed
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            tauri_plugin_positioner::on_tray_event(app, &event);
            match event {
                SystemTrayEvent::LeftClick { .. } => {
                    let window = app.get_window("main").unwrap();
                    let _ = window.move_window(Position::TrayCenter);
                    
                    if window.is_visible().unwrap() {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                _ => {}
            }
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::Focused(is_focused) => {
                // Hide window when it loses focus
                if !is_focused {
                    event.window().hide().unwrap();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 4. Frontend Refactoring & UI Specifications

**CRITICAL: macOS Simulator Removal**
This application currently includes a macOS simulator (specifically the `Menubar` component and the desktop background in `App.tsx`) to demonstrate how the app will look and feel on a user's desktop. **This simulator MUST be completely removed** when building the application using Tauri v2. The native macOS menubar will handle the trigger, and the Tauri window will replace the simulated popover container.

### 1. Remove the Simulated Environment
- Delete the `Menubar.tsx` component entirely.
- Remove the background desktop simulation (`bg-gradient-to-br`, "CLAUDE" text, etc.) from `App.tsx`.

### 2. UI Preservation & Parent Layer Configuration
To ensure the UI does not get tampered with and looks exactly like the current high-fidelity React simulation once the backend is built, **Tauri will have to add a parent layer** to render this UI.

**Specifications to follow (STRICT):**
- **Dimensions:** The Tauri window must be explicitly sized to match the exact dimensions of the `Dashboard` component. The `Dashboard` is currently `w-[400px]` on desktop. The Tauri window should be configured to a fixed width of `400px`. The height must dynamically fit the content or be set to a fixed height that perfectly matches the rendered DOM node (e.g., `max-h-[calc(100vh-50px)]`).
- **Transparency:** The Tauri window must be configured with `transparent: true` and `decorations: false` in `tauri.conf.json`.
- **Parent Layer:** The root `App.tsx` must act as a transparent parent layer (`bg-transparent`) that simply centers the `Dashboard` component. Do not add any padding or margins that would offset the dashboard from the Tauri window edges, unless necessary for the drop shadow.
- **Drop Shadow:** The `Dashboard` uses a `shadow-2xl` class. To ensure this shadow is visible and not clipped by the Tauri window bounds, the Tauri window dimensions might need to be slightly larger than the `Dashboard` itself (e.g., `width: 440, height: 640`), with the `Dashboard` perfectly centered inside the transparent parent layer.
- **Animations:** Framer Motion animations (`initial`, `animate`, `exit`) must be preserved. Ensure the Tauri window is shown *before* the React component mounts or triggers its entrance animation to prevent visual clipping.
- **No Minor Modifications:** The UI must be retained without even a single minor modification. All design tokens (colors, typography, spacing) defined in `Design_System.md` must be strictly adhered to.

### 3. Building the Menubar Icon
The current menubar icon for AI Pulse needs to be converted into a native macOS tray icon.
- **Design:** The icon should be a monochrome, high-contrast SVG or PNG. Specifically, it must match the current web simulation: an `Activity` (pulse) icon alongside the letters "AP" in a bold font.
- **Color:** The icon must be pure white (`#FFFFFF`) or configured to adapt to the system theme.
- **Template Image:** For macOS, the icon file must be named with a `Template` suffix (e.g., `iconTemplate.png` or `iconTemplate@2x.png`) OR configured in `tauri.conf.json` with `"iconAsTemplate": true`. This ensures macOS automatically adapts the icon color for Light and Dark modes.
- **Dimensions:** Provide the icon in multiple resolutions: `16x16` (1x), `32x32` (2x), and `48x48` (3x) to support Retina displays.
- **Implementation:** Place these icons in the `src-tauri/icons` directory and reference them in the `systemTray` configuration.

### 4. Update `App.tsx`
`App.tsx` should now simply render the `Dashboard` component.

```tsx
import { Dashboard } from "./components/Dashboard";
import { DetailedReport } from "./components/DetailedReport";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

export default function App() {
  const [showDetailedReport, setShowDetailedReport] = useState(false);

  return (
    // Transparent background to allow Tauri's transparent window to work
    <div className="min-h-screen bg-transparent text-white font-sans overflow-hidden flex justify-center items-start pt-2">
      <Dashboard onOpenDetailedReport={() => setShowDetailedReport(true)} />
      
      <AnimatePresence>
        {showDetailedReport && (
          <DetailedReport onClose={() => setShowDetailedReport(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 5. Adjust Component Styling
- Ensure the `Dashboard` component has rounded corners (`rounded-2xl`), a background color with transparency (`bg-[#000814]/90 backdrop-blur-xl`), and a border, exactly as it currently does.
- Because the Tauri window will be transparent, the shadow (`shadow-2xl`) applied to the `Dashboard` div will render beautifully against the native macOS desktop.
- You may need to adjust the `max-h-[calc(100vh-50px)]` in `Dashboard.tsx` to fit perfectly within the fixed Tauri window dimensions.

### 6. Handle the Detailed Report Modal
Currently, the `DetailedReport` is a full-screen modal. In a menubar app, you have two choices:
1. **Expand the current window**: When the user clicks "View Detailed Report", dynamically resize the Tauri window to accommodate the larger UI.
2. **Open a new window**: Use Tauri's API to spawn a new, standard macOS window for the detailed report.

**Recommended Approach (New Window)**:
```typescript
import { WebviewWindow } from '@tauri-apps/api/window';

// Inside Dashboard.tsx
const handleOpenDetailedReport = async () => {
  const webview = new WebviewWindow('detailed-report', {
    url: '/report.html', // Or a specific route if using React Router
    title: 'Detailed Usage Report',
    width: 1000,
    height: 800,
  });
};
```
*If you prefer to keep it in the same window, you will need to call Tauri's `appWindow.setSize()` API to expand the tray window.*

## 5. Native Integration Enhancements (Optional but Recommended)

- **Auto-Start**: Use `tauri-plugin-autostart` to allow the app to launch on login.
- **Global Shortcuts**: Use Tauri's `globalShortcut` API to allow users to open the dashboard with a keyboard shortcut (e.g., `Cmd+Shift+C`).
- **Native Notifications**: Replace any simulated toast notifications with Tauri's native notification API.

## 6. Build and Distribute

Once development is complete, build the native macOS `.app` and `.dmg`:

```bash
npm run tauri build
```
This will generate a highly optimized, lightweight native macOS application in `src-tauri/target/release/bundle/`.
