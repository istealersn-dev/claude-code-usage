# AI Pulse — Project Instructions

macOS menubar token/cost monitor for AI coding assistants. **Phase 1 done** (browser simulation). **Phase 2 next** (Tauri v2 native app). See `docs/PRD.md`, `docs/MIGRATION_PLAN.md`, `docs/Design_System.md`.

## Tauri Migration (Phase 2)

When migrating: delete `Menubar.tsx`, strip the desktop bg from `App.tsx` (becomes transparent wrapper), and follow `docs/MIGRATION_PLAN.md` exactly. Do not alter any UI, animations, or design tokens during migration.

## Key Rules

- Import alias: `@/` → `./src/`. Never use relative `../../` paths.
- Mock data lives in `lib/data.ts` only. Never hardcode data in components.
- Never hardcode theme colors — use `providerData.themeColor` / `--theme-color` CSS var.
- `ReportWindow.tsx` is legacy/unused — do not touch it. `DetailedReport.tsx` is current.
- Design tokens (colors, spacing, radii) are locked in `docs/Design_System.md`. Update that file before changing any token.
- `tsconfig.json` is missing `"strict": true` — add it when next touching the config.
- Test files are stored alongside implementation files, and are differentiated using the `*.test.ts` suffix on the file name.

## Code Style

- Named exports per file. No barrel files.
- Conventional commits: `feat(web):`, `fix(api):`, `refactor(docker):` etc.
- Prefer writing clear code and use inline comments sparingly
- TypeScript/JavaScript/CSS:
    - 2-space indent
    - Document all methods, types and interfaces with JSDoc comments
    - Keep `*.test.ts` files in same directory as corresponding `*.ts` file
- Commits: 
    - Use Conventional Commit format
    - **Commit Types:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
    - **Scopes:** `web`, `api`, `docker`

## Code Workflows

- Always avoid commiting code to `main` branch. Always create a new branch for each feature, fix, or doc change.
- Always plan the implementation methods without showcasing any code snippets and seek approval
- Always follow the Conventional Commits format
- Always run `npm run lint`, `npm run types`, and `npm run test` before committing
- **Feature Development:**
    - Create a new branch for each feature: `feat/feature-name`
    - Implement the feature, including tests
    - Commit changes using Conventional Commits
    - Open a Pull Request for review
- **Bug Fixes:**
    - Create a new branch for each fix: `fix/bug-description`
    - Implement the fix, including tests
    - Commit changes using Conventional Commits
    - Open a Pull Request for review
- **Documentation Updates:**
    - Create a new branch for each doc change: `docs/change-description`
    - Update relevant files (e.g., `docs/README.md`, `docs/PRD.md`)
    - Commit changes using Conventional Commits
    - Open a Pull Request for review
