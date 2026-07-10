'use client';

import { useState } from 'react';
import { RangeSlider } from '@kai/ui';

export default function RangeSliderPage() {
  const [range, setRange] = useState<[number, number]>([20, 80]);
  const [narrow, setNarrow] = useState<[number, number]>([2, 5]);

  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">RangeSlider</h1>
        <p className="text-gray-600">
          Dual-thumb range. Drag the handles; values are in <code className="rounded bg-gray-100 px-1">[min, max]</code>
          of the range domain.
        </p>
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-sm font-medium text-gray-500">0 – 100 (default scale)</h2>
        <RangeSlider min={0} max={100} value={range} onChange={setRange} />
        <p className="text-xs text-gray-500">Current: [{range[0]}, {range[1]}]</p>
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-sm font-medium text-gray-500">1 – 10 (step by dragging)</h2>
        <RangeSlider min={1} max={10} value={narrow} onChange={setNarrow} />
        <p className="text-xs text-gray-500">Current: [{narrow[0]}, {narrow[1]}]</p>
      </div>
    </div>
  );
}
