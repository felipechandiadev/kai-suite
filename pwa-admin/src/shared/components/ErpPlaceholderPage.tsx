import type { ReactNode } from 'react';

type ErpPlaceholderPageProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function ErpPlaceholderPage({ title, description, children }: ErpPlaceholderPageProps) {
  return (
    <div className="w-full min-w-0 max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description ? (
        <p className="mt-2 text-muted-foreground">{description}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Módulo en preparación.</p>
      )}
      {children}
    </div>
  );
}
