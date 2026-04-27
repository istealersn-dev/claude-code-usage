# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | ✓ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately by emailing **stanley.j@kriyadocs.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations if you have them

You can expect an acknowledgement within 48 hours and a resolution timeline within 7 days for confirmed issues.

## Scope

AI Pulse reads local files only (`~/.claude/` and `~/.codex/`). It makes no network requests, stores no credentials, and sends no data off-device. Security issues most likely to be relevant:

- Path traversal in the Rust file parser
- IPC command injection via malformed session files
- Privilege escalation via the LaunchAgent plist

Out of scope: social engineering, physical access attacks, vulnerabilities in Tauri or Rust dependencies themselves (report those upstream).
