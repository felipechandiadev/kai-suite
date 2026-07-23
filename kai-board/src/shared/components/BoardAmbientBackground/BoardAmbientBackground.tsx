import "./board-ambient.css";

/** Fondo ambiental fijo (blobs con blur del tema Kai, paridad con admin). */
export default function BoardAmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      data-test-id="board-ambient-bg"
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="board-ambient-blob board-ambient-blob--accent" />
        <div className="board-ambient-blob board-ambient-blob--secondary" />
        <div className="board-ambient-blob board-ambient-blob--soft" />
        <div className="board-ambient-blob board-ambient-blob--primary-mid" />
        <div className="board-ambient-blob board-ambient-blob--accent-low" />
        <div className="board-ambient-blob board-ambient-blob--success" />
      </div>
    </div>
  );
}
