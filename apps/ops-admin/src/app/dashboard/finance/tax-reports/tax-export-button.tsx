'use client';

import React from 'react';

export interface CourierTaxRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  deliveriesCount: number;
  totalEarnings: number;
  t4aEligible: boolean;
}

export interface OntarioHstSummary {
  taxYear: number;
  totalRevenue: number;
  taxablePlatformFees: number;
  hstCollected: number;
  federalShare: number; // 5%
  provincialShare: number; // 8%
}

interface TaxExportButtonsProps {
  taxYear: number;
  courierRows: CourierTaxRow[];
  hstSummary: OntarioHstSummary;
}

export function TaxExportButtons({ taxYear, courierRows, hstSummary }: TaxExportButtonsProps) {
  const downloadT4ACsv = () => {
    const headers = [
      'Payer Name',
      'Payer Jurisdiction',
      'Tax Year',
      'Courier ID',
      'Courier Name',
      'Courier Email',
      'Courier Phone',
      'Completed Deliveries',
      'Box 048 (Fees for Services CAD)',
      'T4A Filing Status',
    ];

    const rows = courierRows.map((c) => [
      'RideNDine Ontario Corp.',
      'Ontario, Canada',
      taxYear,
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.email,
      c.phone,
      c.deliveriesCount,
      c.totalEarnings.toFixed(2),
      c.t4aEligible ? 'REQUIRED (>= $500.00)' : 'EXEMPT (< $500.00)',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cra_t4a_box048_couriers_${taxYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHstCsv = () => {
    const headers = ['Metric', 'Rate / Detail', 'Amount (CAD)'];
    const rows = [
      ['Tax Jurisdiction', 'Ontario, Canada', 'N/A'],
      ['Reporting Tax Year', taxYear.toString(), 'N/A'],
      ['Harmonized Sales Tax (HST) Rate', '13.00%', 'N/A'],
      ['Federal GST Component', '5.00%', hstSummary.federalShare.toFixed(2)],
      ['Ontario PST Component', '8.00%', hstSummary.provincialShare.toFixed(2)],
      ['Total Marketplace Revenue', 'Gross customer order spend', hstSummary.totalRevenue.toFixed(2)],
      ['Taxable Platform Commission & Fees', '13% HST applied', hstSummary.taxablePlatformFees.toFixed(2)],
      ['Total 13% HST Collected / Accrued', 'Payable to CRA', hstSummary.hstCollected.toFixed(2)],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ontario_hst_13pct_summary_${taxYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={downloadT4ACsv}
        className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
      >
        Export CRA T4A CSV (Box 048)
      </button>
      <button
        onClick={downloadHstCsv}
        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-textSubtle hover:border-textSubtle transition-colors"
      >
        Export Ontario HST Summary
      </button>
    </div>
  );
}
