use chrono::Utc;

use crate::paths;

pub fn export_backup() -> Result<String, String> {
    let src = paths::business_db_path();
    if !src.exists() {
        // ensure empty file so export path always works in fresh installs
        let _ = std::fs::File::create(&src);
    }
    let stamp = Utc::now().format("%Y%m%d-%H%M%S");
    let dest = paths::app_data_dir().join(format!("backup-{stamp}.sqlite"));
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    // also copy print db adjacent
    let print_src = paths::print_db_path();
    if print_src.exists() {
        let print_dest = paths::app_data_dir().join(format!("backup-{stamp}-print.sqlite"));
        let _ = std::fs::copy(&print_src, print_dest);
    }
    Ok(dest.display().to_string())
}
