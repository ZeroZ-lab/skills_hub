pub mod fixtures;

use std::path::PathBuf;
use tempfile::TempDir;

pub fn temp_dir() -> TempDir {
    tempfile::tempdir().expect("Failed to create temp directory")
}

pub fn temp_file_path(temp_dir: &TempDir, filename: &str) -> PathBuf {
    temp_dir.path().join(filename)
}

pub fn setup_test_env() {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Debug)
        .is_test(true)
        .try_init();
}
