# Changelog

All notable changes to Skills Hub are documented here.

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
