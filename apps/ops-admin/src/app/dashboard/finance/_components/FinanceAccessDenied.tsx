import { Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

export function FinanceAccessDenied() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <Card className="border-gray-800 bg-opsPanel p-8">
          <h1 className="text-2xl font-bold text-white">Finance Access Required</h1>
          <p className="mt-2 text-gray-400">
            Finance workflows are restricted to ops managers, finance roles, and super admins.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
