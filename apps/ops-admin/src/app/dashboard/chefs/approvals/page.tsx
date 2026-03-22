'use client';

import { Card, Badge, Button, Avatar } from '@ridendine/ui';

const pendingChefs = [
  {
    id: '1',
    name: 'Thai Kitchen Express',
    chefName: 'Suda Patel',
    email: 'suda@example.com',
    phone: '(555) 123-4567',
    cuisineTypes: ['Thai', 'Asian'],
    appliedAt: '2024-01-18',
    documentsComplete: true,
    city: 'Austin, TX',
  },
  {
    id: '2',
    name: 'Soul Food Heaven',
    chefName: 'James Washington',
    email: 'james@example.com',
    phone: '(555) 234-5678',
    cuisineTypes: ['Southern', 'American'],
    appliedAt: '2024-01-17',
    documentsComplete: false,
    city: 'Houston, TX',
  },
  {
    id: '3',
    name: 'Mediterranean Delights',
    chefName: 'Elena Papadopoulos',
    email: 'elena@example.com',
    phone: '(555) 345-6789',
    cuisineTypes: ['Mediterranean', 'Greek'],
    appliedAt: '2024-01-16',
    documentsComplete: true,
    city: 'Dallas, TX',
  },
];

export default function ChefApprovalsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Chef Approvals</h1>
          <p className="mt-1 text-gray-400">Review and approve new chef applications</p>
        </div>

        <div className="mt-8 space-y-4">
          {pendingChefs.map((chef) => (
            <Card key={chef.id} className="bg-gray-800 border-gray-700">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <Avatar
                    alt={chef.chefName}
                    fallback={chef.chefName}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-semibold text-white">{chef.name}</h3>
                    <p className="text-sm text-gray-400">by {chef.chefName}</p>
                    <p className="text-sm text-gray-500">{chef.email} • {chef.phone}</p>
                    <p className="text-sm text-gray-500">{chef.city}</p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {chef.cuisineTypes.map((cuisine) => (
                        <Badge key={cuisine} variant="default">{cuisine}</Badge>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={chef.documentsComplete ? 'success' : 'warning'}>
                        {chef.documentsComplete ? 'Documents Complete' : 'Documents Pending'}
                      </Badge>
                      <span className="text-xs text-gray-500">Applied {chef.appliedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="destructive" size="sm">Reject</Button>
                  <Button variant="success" size="sm" disabled={!chef.documentsComplete}>
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
