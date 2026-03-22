'use client';

import { Card, Input, Button, Textarea } from '@ridendine/ui';

export default function StorefrontPage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Storefront</h1>
        <p className="mt-1 text-gray-500">Customize how customers see your kitchen</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div className="mt-4 space-y-4">
            <Input
              label="Storefront Name"
              defaultValue="Maria's Kitchen"
              placeholder="Your storefront name"
            />
            <Textarea
              label="Description"
              defaultValue="Authentic Mexican cuisine made with love and traditional family recipes."
              placeholder="Tell customers about your kitchen..."
              rows={4}
            />
            <Input
              label="Slug"
              defaultValue="chef-maria"
              placeholder="your-kitchen-name"
              hint="This will be your URL: ridendine.com/chefs/chef-maria"
            />
          </div>
          <Button className="mt-4">Save Changes</Button>
        </Card>

        {/* Images */}
        <Card>
          <h2 className="font-semibold text-gray-900">Images</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Logo</label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-gray-100" />
                <Button variant="outline" size="sm">Upload</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cover Image</label>
              <div className="mt-2 h-32 rounded-lg bg-gray-100" />
              <Button variant="outline" size="sm" className="mt-2">Upload</Button>
            </div>
          </div>
        </Card>

        {/* Cuisine & Tags */}
        <Card>
          <h2 className="font-semibold text-gray-900">Cuisine Types</h2>
          <p className="mt-1 text-sm text-gray-500">Help customers find you by selecting your cuisine types</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Mexican', 'Latin', 'Tex-Mex', 'Vegetarian-Friendly'].map((tag) => (
              <label key={tag} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <input type="checkbox" defaultChecked={['Mexican', 'Latin'].includes(tag)} />
                <span className="text-sm">{tag}</span>
              </label>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4">Add Custom Tag</Button>
        </Card>

        {/* Order Settings */}
        <Card>
          <h2 className="font-semibold text-gray-900">Order Settings</h2>
          <div className="mt-4 space-y-4">
            <Input
              label="Minimum Order Amount"
              type="number"
              defaultValue="15.00"
              placeholder="0.00"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prep Time (min)"
                type="number"
                defaultValue="20"
                placeholder="15"
              />
              <Input
                label="Prep Time (max)"
                type="number"
                defaultValue="35"
                placeholder="45"
              />
            </div>
          </div>
          <Button className="mt-4">Save Changes</Button>
        </Card>
      </div>
    </div>
  );
}
