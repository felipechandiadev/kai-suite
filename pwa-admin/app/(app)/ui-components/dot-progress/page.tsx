'use client';

import { DotProgress } from '@kai/ui';

export default function DotProgressPage() {
  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Dot progress</h1>
        <p className="text-gray-600">
          Step indicator. Without <code className="rounded bg-gray-100 px-1">activeStep</code>, the active dot
          animates. With <code className="rounded bg-gray-100 px-1">activeStep</code>, it stays fixed.
        </p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Auto (5 steps, default)</h2>
        <DotProgress />
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Static — step 2 of 4</h2>
        <DotProgress totalSteps={4} activeStep={2} />
      </div>
    </div>
  );
}
