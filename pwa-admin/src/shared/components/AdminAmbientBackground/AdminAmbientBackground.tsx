import './admin-ambient.css';

/** Fondo ambiental fijo para toda la app admin (blobs con blur del tema Kai). */
export default function AdminAmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      data-test-id="admin-ambient-bg"
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="admin-ambient-blob admin-ambient-blob--accent" />
        <div className="admin-ambient-blob admin-ambient-blob--secondary admin-ambient-blob--delay-2" />
        <div className="admin-ambient-blob admin-ambient-blob--soft admin-ambient-blob--delay-4" />
        <div className="admin-ambient-blob admin-ambient-blob--primary-mid admin-ambient-blob--delay-2" />
        <div className="admin-ambient-blob admin-ambient-blob--accent-low admin-ambient-blob--delay-4" />
        <div className="admin-ambient-blob admin-ambient-blob--success admin-ambient-blob--delay-2" />
      </div>
    </div>
  );
}
