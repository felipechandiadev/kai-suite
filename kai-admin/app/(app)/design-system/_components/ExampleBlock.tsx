type ExampleBlockProps = {
  id: string;
  pattern: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function ExampleBlock({ id, pattern, title, description, children }: ExampleBlockProps) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pattern}</p>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">{children}</div>
    </section>
  );
}
