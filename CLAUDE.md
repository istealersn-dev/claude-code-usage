# Create CLAUDE.md (replace the path below)
cat > CLAUDE.md << 'EOF'
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
Rust backend source: ../claude-pulse/src-tauri/src/
Key modules to port: commands/, parser/, watcher/, models/, aggregator.rs, pricing.rs, lib.rs, state.rs

## Architecture
- Frontend: React 18+ / TypeScript / Tailwind v4 / Framer Motion / Recharts
- Backend: Tauri v2 / Rust / notify / serde / tokio
- State: Zustand (to be added)
- IPC: Tauri invoke() bridge

## Design
Gold accent (#FFD60A) on navy (#000814). Dark mode default.
No visual changes during migration.
EOF