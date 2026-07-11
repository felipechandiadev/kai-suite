type DsPageHeaderProps = {
  title: string;
  description: React.ReactNode;
  kicker?: string;
};

export default function DsPageHeader({ title, description, kicker }: DsPageHeaderProps) {
  return (
    <header className="space-y-3 border-b border-border pb-6">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kicker}</p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</div>
    </header>
  );
}
