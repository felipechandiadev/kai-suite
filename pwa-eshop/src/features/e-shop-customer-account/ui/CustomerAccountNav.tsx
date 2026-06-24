"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cuenta", label: "Resumen", exact: true },
  { href: "/cuenta/pedidos", label: "Pedidos" },
  { href: "/cuenta/pagos", label: "Pagos" },
  { href: "/cuenta/deudas", label: "Deudas" },
  { href: "/cuenta/perfil", label: "Perfil" },
];

export function CustomerAccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
