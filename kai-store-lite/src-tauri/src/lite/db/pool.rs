use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use std::str::FromStr;

pub type LitePool = SqlitePool;

async fn configure(pool: &LitePool) -> anyhow::Result<()> {
    sqlx::query("PRAGMA foreign_keys = ON").execute(pool).await?;
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}

/// Nest/TypeORM `business.sqlite` shares the path but not the sqlx Option B schema
/// (`companies.name`, `users.username`, …). `CREATE TABLE IF NOT EXISTS` leaves the
/// old tables untouched and sqlx still marks migrations applied — then queries fail
/// with `no such column: name`.
async fn is_typeorm_legacy_schema(pool: &LitePool) -> anyhow::Result<bool> {
    let companies_exist: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='companies'",
    )
    .fetch_one(pool)
    .await?;
    if companies_exist == 0 {
        return Ok(false);
    }

    let has_sqlx_name: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('companies') WHERE name = 'name'",
    )
    .fetch_one(pool)
    .await?;
    if has_sqlx_name > 0 {
        // Also reject Nest users (userName) that somehow coexist.
        let has_nest_user: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'userName'",
        )
        .fetch_one(pool)
        .await?;
        return Ok(has_nest_user > 0);
    }
    Ok(true)
}

fn backup_and_remove_db(db_path: &Path) -> anyhow::Result<()> {
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let backup = db_path.with_file_name(format!("business.typeorm-{stamp}.sqlite.bak"));
    if db_path.exists() {
        std::fs::rename(db_path, &backup)?;
        tracing::warn!(
            from = %db_path.display(),
            to = %backup.display(),
            "TypeORM/Nest business.sqlite incompatible with sqlx Option B; backed up and recreating"
        );
    }
    for suffix in ["-wal", "-shm"] {
        let side = {
            let mut p = db_path.as_os_str().to_owned();
            p.push(suffix);
            PathBuf::from(p)
        };
        if side.exists() {
            let _ = std::fs::remove_file(&side);
        }
    }
    Ok(())
}

async fn connect_file(db_path: &Path) -> anyhow::Result<LitePool> {
    let url = format!("sqlite:{}?mode=rwc", db_path.display());
    let opts = SqliteConnectOptions::from_str(&url)?.create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await?;
    Ok(pool)
}

pub async fn open_pool(db_path: &Path) -> anyhow::Result<LitePool> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut pool = connect_file(db_path).await?;
    if is_typeorm_legacy_schema(&pool).await? {
        pool.close().await;
        backup_and_remove_db(db_path)?;
        pool = connect_file(db_path).await?;
    }

    configure(&pool).await?;
    Ok(pool)
}

pub async fn open_memory_pool() -> anyhow::Result<LitePool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await?;
    configure(&pool).await?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn open_pool_replaces_typeorm_legacy_db() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("business.sqlite");

        {
            let pool = connect_file(&path).await.unwrap();
            sqlx::query(
                "CREATE TABLE companies (id TEXT PRIMARY KEY, razon_social TEXT NOT NULL)",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "CREATE TABLE users (id TEXT PRIMARY KEY, userName TEXT NOT NULL, pass TEXT NOT NULL)",
            )
            .execute(&pool)
            .await
            .unwrap();
            pool.close().await;
        }

        let pool = open_pool(&path).await.unwrap();
        let has_name: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM pragma_table_info('companies') WHERE name = 'name'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(has_name, 1);

        let backups: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|n| n.contains("typeorm") && n.ends_with(".bak"))
            .collect();
        assert_eq!(backups.len(), 1);
    }
}
