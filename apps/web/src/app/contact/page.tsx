'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, Button, Input } from '@ridendine/ui';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderNumber: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact_form',
          subject: formData.subject,
          description: `Name: ${formData.name}\nEmail: ${formData.email}\nOrder: ${formData.orderNumber || 'N/A'}\n\n${formData.message}`,
          priority: 'normal',
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-12">
          <div className="mx-auto max-w-lg">
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-gray-900">Message Sent!</h1>
              <p className="mt-2 text-gray-600">
                Thank you for contacting us. We'll get back to you within 24 hours.
              </p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-4 text-gray-600">
            Have a question or need help with an order? We're here to help.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900">Get in Touch</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number (optional)</label>
                  <Input
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    placeholder="RD-XXXXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <Input
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="How can we help?"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us more..."
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900">Email Support</h3>
                <p className="mt-2 text-gray-600">support@ridendine.ca</p>
                <p className="mt-1 text-sm text-gray-500">Response within 24 hours</p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900">Phone Support</h3>
                <p className="mt-2 text-gray-600">1-800-RIDENDINE</p>
                <p className="mt-1 text-sm text-gray-500">Mon-Fri, 9am-9pm EST</p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900">Headquarters</h3>
                <p className="mt-2 text-gray-600">
                  123 Main Street<br />
                  Hamilton, ON L8P 1A1<br />
                  Canada
                </p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
