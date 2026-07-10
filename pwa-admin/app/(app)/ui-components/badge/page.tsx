'use client';

import { Badge } from '@kai/ui';
import type { BadgeVariant } from '@kai/ui';

const FILLED: BadgeVariant[] = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
const OUTLINED: BadgeVariant[] = [
  'primary-outlined',
  'secondary-outlined',
  'success-outlined',
  'error-outlined',
  'warning-outlined',
  'info-outlined',
];

export default function BadgePage() {
  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Badge</h1>
        <p className="text-gray-600">Pills for status, tags, and counts.</p>
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Filled</h2>
        <div className="flex max-w-3xl flex-wrap gap-2">
          {FILLED.map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Outlined</h2>
        <div className="flex max-w-3xl flex-wrap gap-2">
          {OUTLINED.map((v) => (
            <Badge key={v} variant={v}>
              {v.replace('-outlined', '')}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
