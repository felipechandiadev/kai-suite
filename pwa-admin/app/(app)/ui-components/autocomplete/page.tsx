'use client';

import { useState } from 'react';
import { AutoComplete } from '@kai/ui';

const countries = [
  { id: '1', label: 'Chile', value: 'chile' },
  { id: '2', label: 'Argentina', value: 'argentina' },
  { id: '3', label: 'Peru', value: 'peru' },
  { id: '4', label: 'Colombia', value: 'colombia' },
  { id: '5', label: 'Brazil', value: 'brazil' },
  { id: '6', label: 'Mexico', value: 'mexico' },
] as const;

const products = [
  { id: '1', label: 'Laptop', value: 'laptop' },
  { id: '2', label: 'Mouse', value: 'mouse' },
  { id: '3', label: 'Keyboard', value: 'keyboard' },
  { id: '4', label: 'Monitor', value: 'monitor' },
  { id: '5', label: 'Headphones', value: 'headphones' },
  { id: '6', label: 'Webcam', value: 'webcam' },
] as const;

type CountryOption = (typeof countries)[number];
type ProductOption = (typeof products)[number];

export default function AutocompletePage() {
  const [selectedValue1, setSelectedValue1] = useState<CountryOption | null>(null);
  const [selectedValue2, setSelectedValue2] = useState<ProductOption | null>(null);

  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Autocomplete Component Showcase</h1>
        <p className="text-gray-600">Testing search and autocomplete functionality</p>
      </div>

      {/* Basic Example */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Basic Autocomplete</h2>
        <div className="max-w-md">
          <AutoComplete
            label="Search countries"
            options={[...countries]}
            value={selectedValue1}
            onChange={setSelectedValue1}
            placeholder="Type to search..."
          />
          {selectedValue1 && (
            <p className="mt-2 text-sm text-gray-600">
              Selected:{' '}
              <span className="font-semibold">
                {selectedValue1.label} <span className="text-gray-500">({selectedValue1.value})</span>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Multiple Options */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">With Multiple Options</h2>
        <div className="max-w-md">
          <AutoComplete
            label="Select a product"
            options={[...products]}
            value={selectedValue2}
            onChange={setSelectedValue2}
            placeholder="Search products..."
          />
          {selectedValue2 && (
            <p className="mt-2 text-sm text-gray-600">
              Selected:{' '}
              <span className="font-semibold">
                {selectedValue2.label} <span className="text-gray-500">({selectedValue2.value})</span>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Real-time search filtering</li>
          <li>Keyboard navigation support</li>
          <li>Click to select options</li>
          <li>Clear selection button</li>
          <li>Customizable placeholder text</li>
          <li>Empty state handling</li>
        </ul>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Info:</strong> The autocomplete component filters options as you type and allows you to select from the filtered results.
        </p>
      </div>
    </div>
  );
}
