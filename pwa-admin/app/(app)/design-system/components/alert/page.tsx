'use client';

import { Alert } from '@kai/ui';
import type { AlertVariant } from '@kai/ui';

const VARIANTS: { variant: AlertVariant; label: string; text: string }[] = [
  { variant: 'success', label: 'Success', text: 'Operation completed successfully.' },
  { variant: 'info', label: 'Info', text: 'Here is some neutral information for the user.' },
  { variant: 'warning', label: 'Warning', text: 'Please review this before you continue.' },
  { variant: 'error', label: 'Error', text: 'Something went wrong. Try again or contact support.' },
];

export default function AlertPage() {
  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Alert</h1>
        <p className="text-gray-600">
          Inline messages with <code className="rounded bg-gray-100 px-1">variant</code>: success, info, warning, error.
        </p>
      </div>
      <div className="max-w-2xl space-y-4">
        {VARIANTS.map(({ variant, label, text }) => (
          <div key={variant} className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <Alert variant={variant}>
              <span className="text-sm">{text}</span>
            </Alert>
          </div>
        ))}
      </div>
    </div>
  );
}
