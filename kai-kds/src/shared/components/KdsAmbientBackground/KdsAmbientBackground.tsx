import "./kds-ambient.css";

/** Fondo ambiental fijo (blobs con blur del tema Kai, paridad con admin). */
export default function KdsAmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      data-test-id="kds-ambient-bg"
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="kds-ambient-blob kds-ambient-blob--accent" />
        <div className="kds-ambient-blob kds-ambient-blob--secondary" />
        <div className="kds-ambient-blob kds-ambient-blob--soft" />
        <div className="kds-ambient-blob kds-ambient-blob--primary-mid" />
        <div className="kds-ambient-blob kds-ambient-blob--accent-low" />
        <div className="kds-ambient-blob kds-ambient-blob--success" />
      </div>
    </div>
  );
}
