# Claude Pulse — Tauri Migration Agent Teams Playbook

> **Goal:** Wrap the existing AI Studio React UI with Tauri v2 native shell + port Rust backend from old repo.
> **Constraint:** ZERO changes to UI components. The frontend is locked.

---

## Context

| Item | Detail |
|------|--------|
| **Source UI** | Fresh Vite + React project (AI Studio output) — no Tauri |
| **Source Backend** | Old repo with working Rust backend (parser, watcher, aggregator, commands, models) |
| **Target** | Single repo: AI Studio UI + Tauri v2 shell + ported Rust backend |
| **UI Changes** | NONE. Only `App.tsx` entry point and build config may be touched |

---

## Prerequisites

```bash
# Ensure Tauri deps are installed
rustup update
xcode-select --install

# Clone/copy the AI Studio UI into your working directory
cd ~/Documents/Engineering
cp -r <ai-studio-project> claude-pulse-native
cd claude-pulse-native
git init && git add . && git commit -m "feat: initial AI Studio UI"

# Ensure agent teams are enabled
# (should already be in ~/.claude/settings.json from previous work)
```

### Verify Old Repo Access

The old Tauri repo's `src-tauri/` directory is the source for Rust code. Teammates will need its path to copy modules. Set this as an environment variable or include it in CLAUDE.md:

```bash
# Add to project CLAUDE.md
echo 'OLD_REPO="/path/to/old/claude-pulse/src-tauri"' >> CLAUDE.md
```

---

## Project CLAUDE.md

Add this to `claude-pulse-native/CLAUDE.md`:

```markdown
# Claude Pulse — Tauri Migration

## Critical Rule
DO NOT modify any file in src/components/. The UI is final and locked.
Only these files may be created or edited:
- src/App.tsx (minimal changes for Tauri compatibility)
- src/main.tsx (if needed for Tauri entry)
- src-tauri/ (entire directory — new)
- src/hooks/ (new IPC hooks)
- src/store/ (new Zustand store)
- src/lib/ipc.ts (new IPC client)
- vite.config.ts (Tauri plugin addition)
- package.json (new dependencies)
- tailwind.config.ts (no visual changes, only if build requires)
- tsconfig.json (path adjustments only)

## Old Repo Reference
Rust backend source: ${OLD_REPO path here}
Key modules to port: commands/, parser/, watcher/, models/, aggregator.rs, pricing.rs, lib.rs, state.rs

## Architecture
- Frontend: React 18+ / TypeScript / Tailwind v4 / Framer Motion / Recharts
- Backend: Tauri v2 / Rust / notify / serde / tokio
- State: Zustand (to be added)
- IPC: Tauri invoke() bridge

## Design
Gold accent (#FFD60A) on navy (#000814). Dark mode default.
No visual changes during migration.
```

---

## The Prompt

Open Claude Code in `claude-pulse-native/` and paste:

```
I'm migrating Claude Pulse from a web-only React app to a native macOS menubar app using Tauri v2. The React UI was built in Google AI Studio and is FINAL — no component changes allowed.

I have a working Rust backend in an old repo at [INSERT OLD REPO PATH]. That backend has: JSONL parser, file watcher, aggregator, pricing table, 8 IPC commands, tray + popover window setup.

The migration has 4 workstreams that can run in parallel. Create an agent team called "claude-pulse-migration" with 4 teammates:

**Teammate "tauri-shell":**
You are a Tauri v2 specialist. You own the Tauri initialization and native shell setup. Your tasks:

1. Initialize Tauri v2 in this existing Vite + React project:
   - `npm install -D @tauri-apps/cli @tauri-apps/api`
   - `npx tauri init` with correct settings (web assets: ../dist, dev URL: http://localhost:5173)
2. Configure `tauri.conf.json`:
   - Frameless, transparent, hidden-on-startup window (400x600)
   - System tray with iconAsTemplate: true
   - App identifier: com.claudepulse.app
   - No decorations, not resizable, always on top
3. Set up `src-tauri/src/lib.rs` (or main.rs):
   - System tray with click handler to toggle popover window
   - Use tauri-plugin-positioner to position window under tray icon
   - Click-outside-to-dismiss via window blur/focus events
   - Set activation policy to Accessory (no dock icon)
   - Configure vibrancy: under-window, hudWindow material, transparent background
4. Add Tauri plugins to Cargo.toml:
   - tauri-plugin-positioner
   - tauri-plugin-autostart
   - tauri-plugin-notification
   - tauri-plugin-fs
   - tauri-plugin-store
5. Update vite.config.ts to include @tauri-apps/plugin-vite (if needed)
6. Verify `npm run tauri dev` launches with tray icon visible and popover toggles on click

DO NOT touch anything in src/components/. Only modify: src-tauri/, vite.config.ts, package.json, tauri config files.

Message "rust-backend" when tray + window is working so they can register their IPC commands.

**Teammate "rust-backend":**
You are a senior Rust engineer. You own porting the backend from the old repo into this project's src-tauri/.

The old repo's Rust backend is at: [INSERT OLD REPO PATH]/src-tauri/src/
Key modules: commands/, parser/, watcher/, models/, aggregator.rs, pricing.rs, state.rs

Your tasks:
1. Wait for "tauri-shell" to confirm Tauri is initialized
2. Copy and adapt these modules from the old repo into src-tauri/src/:
   - models/ (all shared types with serde rename_all camelCase)
   - parser/ (jsonl.rs, dedup.rs, discovery.rs)
   - watcher/ (file_watcher.rs, events.rs)
   - aggregator.rs
   - pricing.rs
   - state.rs (AppState with shared aggregator)
3. Copy and adapt commands/ (usage.rs, sessions.rs, models.rs, history.rs, preferences.rs)
4. Register all commands in lib.rs (coordinate with "tauri-shell" on the invoke_handler macro)
5. Update pricing.rs: scan real JSONL files in ~/.claude/projects/ and ensure all model IDs found are in the pricing table
6. Run `cargo build` — fix any compilation errors from the port
7. Run `cargo clippy` — clean up warnings

DO NOT touch anything in src/. Only work in src-tauri/.

Message "ipc-bridge" with the exact command signatures and TypeScript return types once all commands compile.

**Teammate "ipc-bridge":**
You are a TypeScript engineer who specializes in Tauri IPC integration. You own the bridge layer between Rust commands and the React UI.

Your tasks:
1. Wait for "rust-backend" to provide command signatures and types
2. Create src/lib/ipc.ts — type-safe invoke() wrappers for all 8 IPC commands:
   - getUsageSummary, getSessionList, getModelBreakdown, getCostSummary
   - getUsageHistory, getProjectUsage, getPreferences, setPreferences
3. Create TypeScript interfaces in src/lib/types.ts matching the Rust models exactly (camelCase)
4. Create src/store/ with Zustand slices:
   - usage-slice.ts, sessions-slice.ts, cost-slice.ts, history-slice.ts, prefs-slice.ts
   - Each slice calls real IPC commands (no mock data)
   - Combined store in src/store/index.ts
5. Create src/hooks/:
   - useTauriEvents.ts — listen to Rust event stream (usage:updated, sessions:updated, etc.)
   - useTheme.ts — system preference detection for dark/light mode
6. Verify TypeScript compiles: `npx tsc --noEmit`

DO NOT modify any file in src/components/. Create new files only in src/lib/, src/store/, src/hooks/.

Message "integration" when the store and IPC client are ready.

**Teammate "integration":**
You are a senior fullstack engineer. You own the minimal App.tsx changes and final wiring.

Your tasks:
1. Wait for "ipc-bridge" to confirm store and IPC are ready
2. Modify ONLY src/App.tsx to:
   - Remove any simulated macOS desktop environment (background gradients, fake menubar, "CLAUDE" text)
   - Make the root div transparent (bg-transparent) so Tauri's transparent window works
   - Wrap the app with Zustand store provider if needed
   - Keep Dashboard as the primary rendered component
   - Handle DetailedReport modal: either expand Tauri window size or spawn a new WebviewWindow
3. Modify ONLY src/main.tsx if needed for Tauri entry point
4. Wire Dashboard's data: identify where the Dashboard currently reads from (props, context, local state, lib/data.ts) and connect those data points to the Zustand store
   - This means adding store hooks (useStore) inside Dashboard — but NOT changing its visual output
   - If Dashboard uses props for data, create a wrapper component that provides store data as props
5. Handle the Settings modal: wire its save actions to the prefs store → IPC → Rust
6. Handle the Detailed Report: wire its data to the store
7. Test: `npm run tauri dev` — verify tray icon appears, popover shows real data, settings save

You MAY add import statements and hook calls inside existing components, but you MUST NOT change any JSX structure, CSS classes, or visual output.

Message the team lead when the app boots successfully with real data.

**Coordination rules for all teammates:**
- The UI in src/components/ is SACRED. Do not modify component JSX, styles, or visual behavior.
- Follow this dependency chain: tauri-shell → rust-backend → ipc-bridge → integration
- Message the next teammate in the chain when your work is ready
- If you need to understand the existing UI's data shape, READ src/lib/data.ts and src/components/ but do NOT edit them
- Commit with conventional commits: feat(scope): description
- Use Linear MCP to update issue status if issues exist for this migration

Wait for all four teammates to complete. Then verify:
1. `cargo build` passes
2. `npm run tauri dev` launches
3. Tray icon visible, popover toggles
4. Real data from ~/.claude/projects/ displays in the UI
5. Settings persist via Rust preferences command

Report the final status honestly.
```

---

## Dependency Chain

```
tauri-shell ──→ rust-backend ──→ ipc-bridge ──→ integration
   (init)         (port)          (bridge)       (wire)
```

Unlike the previous engineering team where all 4 worked in parallel, this migration is **sequential with overlap**. Each teammate starts when their upstream dependency is ready, but earlier teammates can continue polish work while downstream starts.

---

## What to Observe

| Behavior | What It Teaches |
|----------|----------------|
| Sequential dependency chain | Not all agent teams are fully parallel — some need ordered handoffs |
| Teammates waiting for messages | How blockedBy works in practice |
| rust-backend reads old repo | Agents can reference external codebases |
| integration modifies locked files minimally | Constraint-driven development within agent teams |
| Final verification by lead | End-to-end validation after sequential handoffs |

---

## Monitoring

| Action | How |
|--------|-----|
| View dependency progress | Ctrl+T — see which tasks are blocked vs in-progress |
| Check if teammate is waiting | Shift+Down to cycle through panes |
| Nudge a blocked teammate | Tell lead: *"Check if rust-backend has messaged ipc-bridge yet"* |
| Verify UI unchanged | After completion: `git diff src/components/` should show ZERO changes |

---

## Post-Migration Verification

After the team completes, run this yourself:

```bash
# Verify UI untouched
git diff src/components/
# Should show NO changes

# Verify builds
cd src-tauri && cargo build
cd .. && npm run build

# Launch
npm run tauri dev

# Check
# ✅ Tray icon appears in menubar
# ✅ Click opens popover with Dashboard UI
# ✅ Real data from ~/.claude/projects/ shows
# ✅ Click outside dismisses popover
# ✅ No dock icon
# ✅ Settings modal saves preferences
# ✅ Gold/navy design intact
```

---

## Token Cost Estimate

| Teammates | Est. Duration | Est. Tokens | Est. Cost (Sonnet) |
|-----------|---------------|-------------|-------------------|
| 4 + lead | 30-60 min | ~500K-1M | ~$3-8 |

Lower than the previous engineering team because much of the work is porting existing code, not writing from scratch.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| tauri-shell can't find Rust | Ensure `rustup` is installed and `cargo` is in PATH |
| rust-backend can't read old repo | Verify the path in CLAUDE.md is correct and accessible |
| ipc-bridge types don't match | rust-backend should message exact serde output shapes |
| Integration breaks UI | Run `git diff src/components/` — revert any component changes |
| Popover doesn't position correctly | tauri-plugin-positioner may need TrayCenter position config |
| Window not transparent | Check tauri.conf.json has transparent: true AND App.tsx has bg-transparent |