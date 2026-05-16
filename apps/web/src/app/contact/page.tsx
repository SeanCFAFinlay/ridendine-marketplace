'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, Button, Input, Textarea } from '@ridendine/ui';

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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="mx-auto max-w-lg">
            <Card padding="lg" elevated className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-successSoft">
                <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-text">Message Sent!</h1>
              <p className="mt-2 text-textMuted">
                Thank you for contacting us. We'll get back to you within 24 hours.
              </p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-text">
            Contact Us
          </h1>
          <p className="mt-4 text-textMuted">
            Have a question or need help with an order? We're here to help.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Card padding="lg">
              <h2 className="font-semibold text-text">Get in Touch</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <Input
                  label="Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                />
                <Input
                  label="Order Number (optional)"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="RD-XXXXXX"
                />
                <Input
                  label="Subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="How can we help?"
                />
                <Textarea
                  label="Message"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us more..."
                  rows={4}
                />

                {error && <p className="text-sm text-danger">{error}</p>}

                <Button type="submit" loading={submitting} fullWidth>
                  {submitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card padding="lg">
                <h3 className="font-semibold text-text">Email Support</h3>
                <p className="mt-2 text-textMuted">support@ridendine.ca</p>
                <p className="mt-1 text-sm text-textSubtle">Response within 24 hours</p>
              </Card>

              <Card padding="lg">
                <h3 className="font-semibold text-text">Phone Support</h3>
                <p className="mt-2 text-textMuted">1-800-RIDENDINE</p>
                <p className="mt-1 text-sm text-textSubtle">Mon-Fri, 9am-9pm EST</p>
              </Card>

              <Card padding="lg">
                <h3 className="font-semibold text-text">Headquarters</h3>
                <p className="mt-2 text-textMuted">
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
