import { Card, Badge } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  const integrations = [
    {
      name: 'Supabase',
      status: 'active',
      type: 'Database + Auth + Realtime',
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected' : 'Not configured',
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    {
      name: 'Stripe',
      status: process.env.STRIPE_SECRET_KEY ? 'active' : 'inactive',
      type: 'Payments + Connect + Refunds',
      url: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'Live mode' : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'Test mode' : 'Not configured',
      configured: !!process.env.STRIPE_SECRET_KEY,
    },
    {
      name: 'Stripe Webhook',
      status: process.env.STRIPE_WEBHOOK_SECRET ? 'active' : 'inactive',
      type: 'Payment events → Engine',
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridendine.ca'}/api/webhooks/stripe`,
      configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    {
      name: 'Sentry',
      status: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'active' : 'inactive',
      type: 'Error monitoring',
      url: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Connected' : 'Not configured (optional)',
      configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    },
    {
      name: 'Resend',
      status: process.env.RESEND_API_KEY ? 'active' : 'inactive',
      type: 'Email delivery',
      url: process.env.RESEND_API_KEY ? 'Connected' : 'Not configured (optional)',
      configured: !!process.env.RESEND_API_KEY,
    },
    {
      name: 'SLA Processor',
      status: process.env.ENGINE_PROCESSOR_TOKEN ? 'active' : 'inactive',
      type: 'Automated SLA monitoring',
      url: '/api/engine/processors/sla',
      configured: !!process.env.ENGINE_PROCESSOR_TOKEN,
    },
    {
      name: 'Expired Offers Processor',
      status: process.env.ENGINE_PROCESSOR_TOKEN ? 'active' : 'inactive',
      type: 'Automated dispatch cleanup',
      url: '/api/engine/processors/expired-offers',
      configured: !!process.env.ENGINE_PROCESSOR_TOKEN,
    },
  ];

  const activeCount = integrations.filter(i => i.configured).length;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="mt-1 text-gray-400">
            {activeCount}/{integrations.length} integrations active
          </p>
        </div>

        <div className="space-y-3">
          {integrations.map((integration) => (
            <Card key={integration.name} className={`p-5 ${
              integration.configured ? 'border-gray-800 bg-opsPanel' : 'border-yellow-500/30 bg-yellow-950/10'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <Badge className={
                      integration.configured
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }>
                      {integration.configured ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{integration.type}</p>
                  <p className="mt-0.5 text-xs text-gray-500 font-mono">{integration.url}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="border-gray-800 bg-opsPanel p-6">
          <h3 className="text-sm font-semibold text-white mb-2">Configuration</h3>
          <p className="text-xs text-gray-400">
            Integrations are configured via environment variables in the Vercel dashboard.
            Changes require a redeployment. Processor endpoints are secured with the ENGINE_PROCESSOR_TOKEN
            and run on Vercel Cron every 60 seconds.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
