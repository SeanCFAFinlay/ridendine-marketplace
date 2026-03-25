'use client';

import { Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState } from 'react';

export default function SettingsPage() {
  const [platformFee, setPlatformFee] = useState('15');
  const [deliveryFee, setDeliveryFee] = useState('5.99');
  const [minOrderAmount, setMinOrderAmount] = useState('15.00');
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('10');

  const handleSave = () => {
    // In production, this would call an API to save settings
    alert('Settings saved successfully!');
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
          <p className="mt-1 text-gray-400">Configure platform-wide settings and policies</p>
        </div>

        {/* Fee Settings */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Fee Configuration</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Fee (%)
              </label>
              <input
                type="number"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-white focus:border-[#E85D26] focus:outline-none"
                min="0"
                max="100"
              />
              <p className="mt-1 text-xs text-gray-500">Percentage taken from each order</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Base Delivery Fee ($)
              </label>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-white focus:border-[#E85D26] focus:outline-none"
                min="0"
                step="0.01"
              />
              <p className="mt-1 text-xs text-gray-500">Default delivery fee charged to customers</p>
            </div>
          </div>
        </Card>

        {/* Order Settings */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Settings</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Order Amount ($)
              </label>
              <input
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-white focus:border-[#E85D26] focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Delivery Radius (miles)
              </label>
              <input
                type="number"
                value={maxDeliveryRadius}
                onChange={(e) => setMaxDeliveryRadius(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-white focus:border-[#E85D26] focus:outline-none"
                min="1"
              />
            </div>
          </div>
        </Card>

        {/* Platform Status */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Platform Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-lg">
              <div>
                <p className="font-medium text-white">Accept New Orders</p>
                <p className="text-sm text-gray-400">Allow customers to place new orders</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-lg">
              <div>
                <p className="font-medium text-white">Accept New Chef Applications</p>
                <p className="text-sm text-gray-400">Allow new chefs to register</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-lg">
              <div>
                <p className="font-medium text-white">Accept New Driver Applications</p>
                <p className="text-sm text-gray-400">Allow new drivers to register</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#E85D26] px-6 py-3 font-medium text-white hover:bg-[#d54d1a] transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
