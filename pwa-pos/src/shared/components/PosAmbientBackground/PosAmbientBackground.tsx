import "./pos-ambient.css";

/** Fondo ambiental fijo para el POS (blobs con blur del tema Kai, mismo efecto que admin). */
export default function PosAmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      data-test-id="pos-ambient-bg"
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="pos-ambient-blob pos-ambient-blob--accent" />
        <div className="pos-ambient-blob pos-ambient-blob--secondary" />
        <div className="pos-ambient-blob pos-ambient-blob--soft" />
        <div className="pos-ambient-blob pos-ambient-blob--primary-mid" />
        <div className="pos-ambient-blob pos-ambient-blob--accent-low" />
        <div className="pos-ambient-blob pos-ambient-blob--success" />
      </div>
    </div>
  );
}
