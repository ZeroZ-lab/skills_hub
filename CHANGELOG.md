# Changelog

All notable changes to Skills Hub are documented here.

## [0.3.2] - 2026-03-23

### Added
- **Library Import button**: [Import] button in Library page header opens `UnifiedImportModal` — select installed agents (Claude Code, Codex, etc.), import Skills + MCP servers in one flow, see per-agent results table (added/updated/errors)
- **MCPGlobalView component**: New MCP Servers tab in Library with per-agent grouping, add/edit/remove server actions, and connection status indicators
- **UnifiedImportModal**: 3-stage modal (agent selection → importing → results table) with `Promise.allSettled` per-agent isolation (MCP failure doesn't block Skills import), select-all checkbox with indeterminate state, and `onComplete()` called before results render to refresh Library immediately
- **mcp.ts store**: `fetchAllServers`, `fetchAgentServers`, `addAgentServer`, `updateAgentServer`, `removeAgentServer` operations with per-agent map storage

### Fixed
- **GitHub Actions release.yml**: Completely rewrote broken workflow — `upload_url` was never declared as an output (致命 bug), used deprecated/archived actions (`create-release@v1`, `upload-release-asset@v1`). New workflow uses `tauri-apps/tauri-action@v0` (official Tauri action), auto-creates GitHub Release, attaches DMG/NSIS/MSI/AppImage artifacts
- **GitHub Actions ci.yml**: Fixed `dtolnay/rust-action` → `rust-toolchain`, pnpm v8 → v10, `libwebkit2gtk-4.0-dev` → `4.1-dev` (Tauri 2), added missing `libgtk-3-dev`/`libayatana-appindicator3-dev`/`libssl-dev`, added `Swatinem/rust-cache@v2`, fixed `pnpm install` to run from repo root (monorepo lockfile location), added `working-directory: apps/desktop` to build step

### Tests
- 21 tests for `UnifiedImportModal` (all 4 stages, partial failure, MCP skip, select-all, onComplete timing)
- 14 tests for `MCPGlobalView` (loading, empty state, agent grouping, CRUD actions)
- 6 tests for `mcp.ts` store (fetch, add, update, remove, error paths)

## [0.3.1] - 2026-03-22

### Fixed
- **Skills discovery install source**: Skills discovered on the Discover page now correctly install via `owner/repo@skillId` format rather than bare `owner/repo`, enabling the Install button to pre-fill the InstallModal with the correct source
- **Featured skills list**: Replaced placeholder `q="ai"` hack with concurrent multi-keyword queries (`git`, `react`, `python`, `test`, `docker`) aggregated and sorted by install count, giving a genuinely representative featured list
- **React list key**: `SkillDiscoveryCard` now uses `skill.id` as the React key instead of `skill.name`, preventing DOM reconciliation bugs when multiple skills share the same name

### Added
- `install_source` field on `DiscoveredSkill` (Rust + TypeScript): pre-computed `owner/repo@skillId` install URL, sourced from the `skillId` field returned by the skills.sh API
- `get_featured_skills_with_meta()` service function: concurrent `tokio::task::JoinSet` implementation with 24h cache, partial-failure tolerance, and dedup+sort by installs
- Unit tests: `test_install_source_format` and `test_install_source_fallback_to_name` for regression protection on the install URL construction logic
- Input trimming on `source` and `skill_id` fields from API to guard against whitespace-only values

## [0.3.0] - initial

- Initial release
