export const metadata = {
  title: 'Maintenance | RideNDine',
  description: 'RideNDine is temporarily down for maintenance. We will be back soon.',
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🍽️</div>
        <h1 className="text-3xl font-bold text-gray-900">We&apos;ll be back soon</h1>
        <p className="mt-4 text-lg text-gray-600">
          RideNDine is temporarily down for scheduled maintenance. Our team is working quickly
          to get things back up and running.
        </p>
        <p className="mt-6 text-sm text-gray-500">
          Thank you for your patience. Check back in a few minutes.
        </p>
      </div>
    </div>
  );
}
