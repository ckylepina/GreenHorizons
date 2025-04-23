// components/Dashboard/InvoiceList.tsx
import React from 'react';
import Link from 'next/link';

export interface Invoice {
  id: string;
  sale_date: string;
  total_amount: number;
  customer_name: string;
}

export interface InvoiceListProps {
  recentInvoices: Invoice[];
  allInvoices: Invoice[];
}

export default function InvoiceList({
  recentInvoices,
  allInvoices,
}: InvoiceListProps) {
  const renderTable = (invoices: Invoice[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            {['Date', 'Customer', 'Amount', 'Action'].map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {invoices.map((inv, idx) => (
            <tr
              key={inv.id}
              className={
                idx % 2 === 0
                  ? 'bg-white dark:bg-gray-900'
                  : 'bg-gray-50 dark:bg-gray-800'
              }
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                {new Date(inv.sale_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                {inv.customer_name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                ${inv.total_amount.toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <Link
                  href={`/invoice/${inv.id}`}
                  className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <h2 className="text-2xl font-semibold mb-6 dark:text-gray-100">Invoices</h2>

      <section className="mb-8">
        <h3 className="text-xl font-medium mb-4 dark:text-gray-200">
          Recent (Last 7 days)
        </h3>
        {recentInvoices.length ? (
          renderTable(recentInvoices)
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No recent invoices.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-xl font-medium mb-4 dark:text-gray-200">
          All Invoices
        </h3>
        {allInvoices.length ? (
          renderTable(allInvoices)
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No invoices found.
          </p>
        )}
      </section>
    </>
  );
}