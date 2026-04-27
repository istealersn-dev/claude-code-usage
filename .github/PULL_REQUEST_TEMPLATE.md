## What changed and why

<!-- Briefly describe the change and the motivation behind it. Link the related issue if one exists. -->

Closes #

## Checklist

- [ ] Pre-commit hook passes (`npm run types`, `npm run lint`, `cargo clippy`)
- [ ] No mock or hardcoded data introduced for real providers
- [ ] No new dependencies added without prior discussion
- [ ] No network calls, telemetry, or remote data fetching added
- [ ] Tested locally with `npm run tauri dev`
