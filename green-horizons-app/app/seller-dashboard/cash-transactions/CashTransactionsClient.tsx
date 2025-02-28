'use client';

import React from 'react';
import type { Database } from '@/database.types';

type Props = {
  transactions: Database['public']['Tables']['cash_transactions']['Row'][];
  safeInfo: Database['public']['Tables']['safe']['Row'] | null;
};

export default function CashTransactionsClient({ transactions, safeInfo }: Props) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Cash Transactions & Safe Info</h1>
      {safeInfo ? (
        <div className="mb-4">
          <p className="text-lg">Safe Balance: ${safeInfo.current_balance}</p>
          <p className="text-sm">
            Last Updated:{' '}
            {safeInfo.last_updated ? new Date(safeInfo.last_updated).toLocaleString() : 'N/A'}
          </p>
        </div>
      ) : (
        <p>No safe info available.</p>
      )}
      <h2 className="text-2xl font-semibold mb-2">Recent Transactions</h2>
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((tx) => (
            <li key={tx.id} className="border p-2 rounded">
              <p>Type: {tx.transaction_type}</p>
              <p>Amount: ${tx.amount}</p>
              <p>Date: {tx.transaction_date ? new Date(tx.transaction_date).toLocaleString() : 'N/A'}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
