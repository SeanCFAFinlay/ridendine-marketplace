import { WeeklyAvailabilityForm } from '@/components/availability/weekly-availability-form';

export const dynamic = 'force-dynamic';

export default function AvailabilityPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Kitchen hours</h1>
      <p className="mt-1 text-gray-500">
        Control when customers can place orders. Changes save to the database immediately.
      </p>
      <div className="mt-8 max-w-2xl">
        <WeeklyAvailabilityForm />
      </div>
    </div>
  );
}
