use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::CommandError;
use crate::source::parser::ParsedSource;

/// A skill resolved from a remote or local source, ready to be fetched/installed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedSkill {
    /// Display name of the skill
    pub name: String,
    /// Description of the skill (from SKILL.md frontmatter, if available)
    pub description: Option<String>,
    /// The canonical source URL
    pub source_url: String,
    /// Source type (e.g., "github", "local")
    pub source_type: String,
    /// Provider that resolved this skill
    pub provider: String,
    /// Sub-path within the repo where the skill lives
    pub subpath: Option<String>,
}

/// Trait for host-specific skill providers (GitHub, GitLab, local, etc.).
///
/// Each provider knows how to:
/// - Identify which parsed sources it handles
/// - Resolve a parsed source into one or more skills
/// - Fetch/download the skill files into a target directory
#[async_trait]
pub trait HostProvider: Send + Sync {
    /// Human-readable name of this provider (e.g., "github", "local").
    fn name(&self) -> &str;

    /// Returns `true` if this provider can handle the given parsed source.
    fn can_handle(&self, parsed: &ParsedSource) -> bool;

    /// Resolve a parsed source into a list of skills found at that source.
    /// For repos with multiple skills, this returns all of them.
    async fn resolve(&self, parsed: &ParsedSource) -> Result<Vec<ResolvedSkill>, CommandError>;

    /// Fetch/download a resolved skill's files into `target_dir`.
    async fn fetch(
        &self,
        resolved: &ResolvedSkill,
        target_dir: &std::path::Path,
    ) -> Result<(), CommandError>;
}
