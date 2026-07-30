import Link from 'next/link';

type DsSectionCardProps = {
  title: string;
  description: string;
  href: string;
};

export default function DsSectionCard({ title, description, href }: DsSectionCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-neutral/30"
    >
      <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-4 text-xs font-medium text-primary">Ver sección →</span>
    </Link>
  );
}
