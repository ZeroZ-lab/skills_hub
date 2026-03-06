use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::CommandError;

/// Metadata parsed from a SKILL.md file's YAML frontmatter.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Parse SKILL.md content and extract YAML frontmatter metadata.
///
/// Expects the content to start with `---` delimited YAML frontmatter:
/// ```markdown
/// ---
/// name: my-skill
/// description: A useful skill
/// version: 1.0.0
/// author: John
/// tags: [ai, coding]
/// ---
///
/// # My Skill
/// ...
/// ```
///
/// Returns `SkillMetadata` with all fields optional. If no frontmatter
/// is found, returns a default (all-None) metadata.
pub fn parse_skill_md(content: &str) -> SkillMetadata {
    let trimmed = content.trim();

    // Check for YAML frontmatter delimiters
    if !trimmed.starts_with("---") {
        return SkillMetadata::default();
    }

    // Find the closing `---` delimiter (skip the opening one)
    let after_open = &trimmed[3..];
    let closing_pos = after_open.find("\n---");

    let yaml_str = match closing_pos {
        Some(pos) => &after_open[..pos],
        None => {
            // No closing delimiter found, no valid frontmatter
            return SkillMetadata::default();
        }
    };

    let yaml_trimmed = yaml_str.trim();
    if yaml_trimmed.is_empty() {
        return SkillMetadata::default();
    }

    // Parse the YAML frontmatter
    match serde_yaml::from_str::<SkillMetadata>(yaml_trimmed) {
        Ok(meta) => meta,
        Err(_) => SkillMetadata::default(),
    }
}

/// Read and parse the SKILL.md file from a directory.
///
/// Looks for a file named `SKILL.md` in the given directory.
pub fn read_skill_md(dir: &Path) -> Result<SkillMetadata, CommandError> {
    let skill_md_path = dir.join("SKILL.md");

    if !skill_md_path.exists() {
        return Err(CommandError::InvalidSkill(format!(
            "SKILL.md not found in {}",
            dir.display()
        )));
    }

    let content = std::fs::read_to_string(&skill_md_path).map_err(|e| {
        CommandError::InvalidSkill(format!(
            "Failed to read SKILL.md in {}: {}",
            dir.display(),
            e
        ))
    })?;

    Ok(parse_skill_md(&content))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_skill_md_full() {
        let content = r#"---
name: my-skill
description: A useful skill
version: 1.0.0
author: John
tags: [ai, coding]
---

# My Skill

Skill content here...
"#;
        let meta = parse_skill_md(content);
        assert_eq!(meta.name.as_deref(), Some("my-skill"));
        assert_eq!(meta.description.as_deref(), Some("A useful skill"));
        assert_eq!(meta.version.as_deref(), Some("1.0.0"));
        assert_eq!(meta.author.as_deref(), Some("John"));
        assert_eq!(meta.tags, vec!["ai".to_string(), "coding".to_string()]);
    }

    #[test]
    fn test_parse_skill_md_minimal() {
        let content = r#"---
name: minimal-skill
---

# Minimal
"#;
        let meta = parse_skill_md(content);
        assert_eq!(meta.name.as_deref(), Some("minimal-skill"));
        assert_eq!(meta.description, None);
        assert_eq!(meta.version, None);
        assert_eq!(meta.author, None);
        assert!(meta.tags.is_empty());
    }

    #[test]
    fn test_parse_skill_md_no_frontmatter() {
        let content = "# Just a regular markdown file\n\nNo frontmatter here.";
        let meta = parse_skill_md(content);
        assert_eq!(meta.name, None);
    }

    #[test]
    fn test_parse_skill_md_empty() {
        let meta = parse_skill_md("");
        assert_eq!(meta.name, None);
    }

    #[test]
    fn test_parse_skill_md_unclosed_frontmatter() {
        let content = "---\nname: broken\n# No closing delimiter";
        let meta = parse_skill_md(content);
        assert_eq!(meta.name, None);
    }

    #[test]
    fn test_read_skill_md_from_dir() {
        let temp = tempfile::tempdir().unwrap();
        let skill_md = temp.path().join("SKILL.md");
        std::fs::write(
            &skill_md,
            "---\nname: test-skill\nversion: 2.0.0\n---\n\n# Test",
        )
        .unwrap();

        let meta = read_skill_md(temp.path()).unwrap();
        assert_eq!(meta.name.as_deref(), Some("test-skill"));
        assert_eq!(meta.version.as_deref(), Some("2.0.0"));
    }

    #[test]
    fn test_read_skill_md_missing_file() {
        let temp = tempfile::tempdir().unwrap();
        let result = read_skill_md(temp.path());
        assert!(result.is_err());
    }
}
