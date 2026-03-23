import { Card } from '@ridendine/ui';

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="mt-2 h-4 w-64 bg-gray-200 rounded" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="mt-2 h-8 w-16 bg-gray-200 rounded" />
            <div className="mt-2 h-3 w-20 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </Card>
    </div>
  );
}
