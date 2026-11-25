'use client';

import type { LaunchSignup } from '@ridendine/db';

/** Quote a CSV cell, and stop spreadsheets from running it as a formula. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function LaunchListDownload({ signups }: { signups: LaunchSignup[] }) {
  function download() {
    const csv = [
      ['Email', 'Source', 'Consented at', 'Consent wording'],
      ...signups.map((s) => [s.email, s.source, s.consented_at, s.consent_text]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ridendine-launch-list.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-textSubtle hover:border-textSubtle"
    >
      Download CSV
    </button>
  );
}
