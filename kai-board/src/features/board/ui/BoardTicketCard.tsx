"use client";

import type { BoardTicket } from "../lib/board.types";

function ticketLabel(ticket: BoardTicket): string {
  if (ticket.kitchenFireNumber != null) {
    return String(ticket.kitchenFireNumber);
  }
  return "—";
}

export function BoardTicketCard({
  ticket,
  emphasis,
}: {
  ticket: BoardTicket;
  emphasis?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-2xl border px-4 py-5 text-center shadow-sm transition-all duration-500",
        emphasis
          ? "animate-pulse border-emerald-400/80 bg-emerald-500/25 text-emerald-50"
          : "border-white/15 bg-surface/90 text-foreground",
      ].join(" ")}
      data-test-id={`board-ticket-${ticket.fireId}`}
      data-column={ticket.column}
    >
      <p className="text-5xl font-bold tabular-nums tracking-tight md:text-6xl lg:text-7xl">
        {ticketLabel(ticket)}
      </p>
      <p className="mt-2 truncate text-lg font-medium text-foreground/90 md:text-xl">
        {ticket.customerName}
      </p>
    </article>
  );
}
