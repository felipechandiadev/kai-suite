use tracing::info;

/// Legacy text outbox helper (kept for diagnostics).
#[allow(dead_code)]
pub fn enqueue_test_print(body: &str) -> Result<(), String> {
    info!("print test enqueued (legacy text path)");
    crate::print::platform::send_raw_text(body)
}
