use crate::lite::application::seed;
use crate::lite::db::pool::{open_memory_pool, open_pool, LitePool};
use tempfile::TempDir;

pub async fn lite_test_pool() -> LitePool {
    let pool = open_memory_pool().await.expect("open memory pool");
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .ok();
    seed::run_seed(&pool).await.expect("seed");
    pool
}

pub async fn lite_test_pool_file() -> (TempDir, LitePool) {
    let dir = TempDir::new().expect("tempdir");
    let path = dir.path().join("test.sqlite");
    let pool = open_pool(&path).await.expect("open file pool");
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .ok();
    (dir, pool)
}
