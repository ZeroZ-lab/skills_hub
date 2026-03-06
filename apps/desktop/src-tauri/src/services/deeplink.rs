use crate::commands::system::DeepLinkAction;
use crate::error::CommandError;
use crate::source::parser::parse_source;

/// Parse a deep link URL and return a `DeepLinkAction`.
///
/// Expected format: `skillsmanager://install?source=<url_encoded_source>`
///
/// # Arguments
/// * `url` - The full deep link URL string.
///
/// # Returns
/// A `DeepLinkAction` describing the action type, source, and (currently empty)
/// resolved skills list. Actual skill resolution requires async network calls
/// and should be performed separately by the frontend.
pub fn parse_deep_link(url: &str) -> Result<DeepLinkAction, CommandError> {
    // Parse the URL.
    let parsed = url::Url::parse(url)
        .map_err(|e| CommandError::InvalidSource(format!("Invalid deep link URL: {}", e)))?;

    // Validate the scheme.
    if parsed.scheme() != "skillsmanager" {
        return Err(CommandError::InvalidSource(format!(
            "Unsupported deep link scheme: '{}'. Expected 'skillsmanager'.",
            parsed.scheme()
        )));
    }

    // The host portion is the action type (e.g., "install").
    let action_type = parsed.host_str().unwrap_or_default().to_string();

    if action_type.is_empty() {
        return Err(CommandError::InvalidSource(
            "Deep link is missing an action type (e.g. 'install')".to_string(),
        ));
    }

    // Extract the "source" query parameter.
    let source = parsed
        .query_pairs()
        .find(|(key, _)| key == "source")
        .map(|(_, value)| value.to_string())
        .ok_or_else(|| {
            CommandError::InvalidSource(
                "Deep link is missing the 'source' query parameter".to_string(),
            )
        })?;

    if source.is_empty() {
        return Err(CommandError::InvalidSource(
            "Deep link 'source' parameter is empty".to_string(),
        ));
    }

    // Validate that the source string can be parsed (but don't resolve yet).
    let _parsed_source = parse_source(&source);

    Ok(DeepLinkAction {
        action_type,
        source,
        resolved_skills: vec![],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_install_deep_link() {
        let url = "skillsmanager://install?source=owner%2Frepo";
        let result = parse_deep_link(url).unwrap();
        assert_eq!(result.action_type, "install");
        assert_eq!(result.source, "owner/repo");
        assert!(result.resolved_skills.is_empty());
    }

    #[test]
    fn test_parse_deep_link_github_url() {
        let url = "skillsmanager://install?source=https%3A%2F%2Fgithub.com%2Fowner%2Frepo";
        let result = parse_deep_link(url).unwrap();
        assert_eq!(result.action_type, "install");
        assert_eq!(result.source, "https://github.com/owner/repo");
    }

    #[test]
    fn test_parse_deep_link_bad_scheme() {
        let url = "https://install?source=owner%2Frepo";
        let result = parse_deep_link(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_deep_link_missing_source() {
        let url = "skillsmanager://install";
        let result = parse_deep_link(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_deep_link_empty_source() {
        let url = "skillsmanager://install?source=";
        let result = parse_deep_link(url);
        assert!(result.is_err());
    }
}
