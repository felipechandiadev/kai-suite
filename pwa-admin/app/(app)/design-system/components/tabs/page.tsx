'use client';

import { Tabs } from '@kai/ui';

const NAV_TABS = [
  { label: 'Button', url: '/design-system/components/button' },
  { label: 'Cards', url: '/design-system/components/cards' },
  { label: 'Tabs (here)', url: '/design-system/components/tabs' },
];

export default function TabsPage() {
  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Tabs</h1>
        <p className="text-gray-600">
          Link-based navigation. Active state follows the current route (on this page, the &ldquo;Tabs&rdquo; item is
          active) or the <code className="rounded bg-gray-100 px-1">activeTab</code> prop when you pass an exact URL
          string.
        </p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Real links to other showcases</h2>
        <div className="max-w-3xl border-b border-border">
          <Tabs items={NAV_TABS} />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Forced active: second item (preview)</h2>
        <div className="max-w-3xl border-b border-border">
          <Tabs items={NAV_TABS} activeTab="/design-system/components/cards" />
        </div>
      </div>
    </div>
  );
}
