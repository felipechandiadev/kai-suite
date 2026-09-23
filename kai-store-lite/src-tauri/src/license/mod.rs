pub mod activation_hashes;
pub mod fingerprint;
pub mod store;
pub mod trial;
pub mod verify;

pub use fingerprint::machine_fingerprint;
pub use store::save_license;
pub use trial::start_trial;
pub use verify::{activate_with_code, current_status, verify_license_json, LicenseStatusDto};
