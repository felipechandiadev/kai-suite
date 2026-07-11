'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { designSystemSections } from '@/navigation/designSystemNav';

function isActive(pathname: string, href: string): boolean {
  if (href === '/design-system') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DesignSystemShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-[calc(var(--app-topbar-height,3.75rem)+1rem)] lg:max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2rem)] lg:overflow-y-auto">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Design System</p>
          <nav className="space-y-6" aria-label="Design system">
            {designSystemSections.map((section) => (
              <div key={section.id}>
                {section.href && section.id !== 'overview' ? (
                  <Link
                    href={section.href}
                    className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${
                      isActive(pathname, section.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {section.label}
                  </Link>
                ) : (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                            active
                              ? 'bg-neutral font-medium text-foreground'
                              : 'text-muted-foreground hover:bg-neutral/60 hover:text-foreground'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-8">{children}</div>
    </div>
  );
}
