export function sanitizeMarkdown(raw: string): string {
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withCode = withBold.replace(/`([^`]+)`/g, "<code>$1</code>");
  const lines = withCode.split("\n").map((line) => {
    if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
    return line;
  });
  let html = "";
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("<li>")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += line;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += line ? `<p>${line}</p>` : "";
    }
  }
  if (inList) html += "</ul>";
  return html || "<p></p>";
}

export function chartSeriesToRecharts(
  series: Array<{ id: string; label: string; points: Array<{ x: string; y: number }> }>,
) {
  const xs = new Set<string>();
  for (const s of series) {
    for (const p of s.points) xs.add(p.x);
  }
  return [...xs].map((x) => {
    const row: Record<string, string | number> = { x };
    for (const s of series) {
      row[s.id] = s.points.find((p) => p.x === x)?.y ?? 0;
    }
    return row;
  });
}
