import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chef Resources - RideNDine',
  description: 'Helpful guides and resources for RideNDine chefs',
};

const resources = [
  {
    category: 'Getting Started',
    items: [
      {
        title: 'New Chef Onboarding Guide',
        description:
          'Step-by-step guide to setting up your storefront and creating your first menu items.',
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      },
      {
        title: 'Food Safety Best Practices',
        description:
          'Essential food safety guidelines and certification requirements for home chefs.',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      },
    ],
  },
  {
    category: 'Menu & Pricing',
    items: [
      {
        title: 'Menu Photography Tips',
        description:
          'Learn how to take stunning food photos that attract more customers.',
        icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
      },
      {
        title: 'Pricing Strategy Guide',
        description:
          'How to price your menu items competitively while maintaining profitability.',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
    ],
  },
  {
    category: 'Operations',
    items: [
      {
        title: 'Order Management Best Practices',
        description:
          'Tips for efficiently managing orders and communicating with customers.',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      },
      {
        title: 'Packaging & Presentation',
        description:
          'How to package meals for delivery to ensure quality and presentation.',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      },
    ],
  },
  {
    category: 'Marketing',
    items: [
      {
        title: 'Building Your Brand',
        description:
          'Create a compelling brand story that resonates with your target customers.',
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      },
      {
        title: 'Social Media for Chefs',
        description:
          'Leverage social media to grow your following and attract new customers.',
        icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
      },
    ],
  },
];

export default function ChefResourcesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="container py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h1 className="text-[40px] font-bold leading-tight tracking-tight text-[#2D3436]">
              Chef Resources
            </h1>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#5F6368]">
              Everything you need to succeed as a Ridendine chef
            </p>
          </div>

          <div className="mb-12 rounded-lg border border-[#E8E8E8] bg-white p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-[#2D3436]">
                  Ready to get started?
                </h2>
                <p className="mt-1 text-[15px] leading-[1.6] text-[#5F6368]">
                  Join hundreds of chefs already earning on Ridendine
                </p>
              </div>
              <Link href="/chef-signup">
                <Button size="lg" className="bg-[#FF6B6B] hover:bg-[#FF5252]">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-12">
            {resources.map((section) => (
              <div key={section.category}>
                <h2 className="mb-6 text-[24px] font-semibold tracking-tight text-[#2D3436]">
                  {section.category}
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {section.items.map((resource) => (
                    <Card
                      key={resource.title}
                      className="transition-shadow hover:shadow-md"
                      padding="lg"
                    >
                      <CardHeader>
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF8F0]">
                          <svg
                            className="h-6 w-6 text-[#FF6B6B]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={resource.icon}
                            />
                          </svg>
                        </div>
                        <CardTitle className="text-[18px]">
                          {resource.title}
                        </CardTitle>
                        <CardDescription className="mt-2 text-[15px] leading-[1.6]">
                          {resource.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-lg border border-[#E8E8E8] bg-white p-8 text-center">
            <h2 className="text-[24px] font-semibold text-[#2D3436]">
              Need Help?
            </h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-[#5F6368]">
              Our support team is here to help you succeed
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link href="/contact">
                <Button variant="outline">Contact Support</Button>
              </Link>
              <Link href="/auth/login">
                <Button>Chef Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
