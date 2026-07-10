'use client';

import { useState } from 'react';
import { NumberStepper } from '@kai/ui';

export default function NumberStepperPage() {
  const [qty, setQty] = useState(1);
  const [percent, setPercent] = useState(0);

  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">NumberStepper</h1>
        <p className="text-gray-600">Increment / decrement with optional min, max, and label.</p>
      </div>
      <div className="max-w-sm space-y-6">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">Quantity (1–99)</h2>
          <NumberStepper
            label="Qty"
            value={qty}
            onChange={setQty}
            min={1}
            max={99}
            data-test-id="showcase-qty"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">With optional icon string</h2>
          <NumberStepper
            label="Units"
            icon="%"
            iconPosition="beside"
            value={percent}
            onChange={setPercent}
            min={0}
            max={100}
            data-test-id="showcase-pct"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">Disabled</h2>
          <NumberStepper label="Fixed" value={5} onChange={() => {}} min={0} max={10} disabled />
        </div>
      </div>
    </div>
  );
}
