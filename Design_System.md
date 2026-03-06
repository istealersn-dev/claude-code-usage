# AI Pulse Design System

This document outlines the strict design tokens and UI specifications for the AI Pulse application. **These tokens must be adhered to without a single minor modification** when migrating to the Tauri v2 backend or extending the UI.

## 1. Dimensions & Layout

The application is designed as a fixed-size macOS menubar popover.

*   **Dashboard Width:** `400px` (Desktop/sm breakpoint) / `360px` (Mobile fallback).
*   **Dashboard Height:** Dynamic based on content, constrained to `max-h-[calc(100vh-50px)]`.
*   **Border Radius:**
    *   Main Container: `16px` (`rounded-2xl`)
    *   Inner Cards/Sections: `12px` (`rounded-xl`)
    *   List Items/Buttons: `8px` (`rounded-lg`)
*   **Padding/Spacing:**
    *   Main Container Padding: `24px` (`p-6`)
    *   Header Padding: `16px` (`p-4`)
    *   Inner Card Padding: `12px` (`p-3`)

## 2. Color Palette

The UI relies on a deep navy/black glassmorphism aesthetic with vibrant, provider-specific accents.

### Base Colors
*   **Background (Glass):** `#000814` at 90% opacity (`bg-[#000814]/90`)
*   **Surface 1 (Cards):** `#001d3d` at 40% opacity (`bg-[#001d3d]/40`)
*   **Surface 2 (Hover/Active):** `#001d3d` at 50% opacity (`bg-[#001d3d]/50`)
*   **Borders:** `#003566` (often used with `/30` or `/50` opacity)

### Text Colors
*   **Primary Text:** `#FFFFFF` (White)
*   **Secondary Text:** `#D1D5DB` (Gray 300)
*   **Tertiary/Muted Text:** `#9CA3AF` (Gray 400)
*   **Error Text:** `#F87171` (Red 400)

### Provider Accents (Dynamic Theming)
These colors are injected via the `--theme-color` CSS variable based on the selected provider.
*   **AI Pulse (Claude):**
    *   Primary: `#ffd60a` (Vibrant Yellow)
    *   Dark: `#ffc300`
*   **OpenAI Codex:**
    *   Primary: `#10a37f` (OpenAI Green)
    *   Dark: `#0d8a6a`
*   **Google Gemini:**
    *   Primary: `#8ab4f8` (Google Blue)
    *   Dark: `#669df6`

## 3. Typography

The application uses a dual-font system to separate data from labels.

*   **Sans-Serif (Labels, Headers, UI Elements):**
    *   Font Family: `Inter`, system-ui, sans-serif (`font-sans`)
    *   Weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
*   **Monospace (Numbers, Tokens, Costs, Code):**
    *   Font Family: `JetBrains Mono`, ui-monospace, monospace (`font-mono`)
    *   Weights: Regular (400)

## 4. Effects & Shadows

*   **Glassmorphism Blur:** `backdrop-blur-xl` (24px blur radius) applied to the main container.
*   **Main Container Shadow:** `shadow-2xl` (0 25px 50px -12px rgba(0, 0, 0, 0.25)). *Note: The Tauri parent window must be large enough to render this shadow without clipping.*
*   **Inner Shadows:** `shadow-sm` used sparingly on active toggle buttons.

## 5. Icons

*   **Library:** `lucide-react`
*   **Menubar Icon:** `Activity` icon + "AP" text (Bold). Color: White (`#FFFFFF`).
*   **Stroke Width:** Default (2px).
*   **Sizes:**
    *   Standard UI Icons: `12px` (`w-3 h-3`)
    *   Header Provider Icons: `16px` (`w-4 h-4`)

## 6. Strict UI Preservation Rule

When rendering this UI inside the Tauri v2 parent container, **the parent layer must act strictly as a transparent canvas**. It must not inject any default margins, paddings, or background colors that would alter the dimensions or appearance of the React components defined by these tokens.
