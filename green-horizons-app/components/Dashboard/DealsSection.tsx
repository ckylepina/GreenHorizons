// components/Dashboard/DealsSection.tsx
'use client';

import React from 'react';

interface Deal {
  id: number;
  agreed_price: number;
  status: string;
  seller_id: number;
  customer_id: number;
  payment_due_date: string;
  created_at: string;
}

interface DealsSectionProps {
  deals: Deal[];
}

export default function DealsSection({ deals }: DealsSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Deals</h2>
      {deals?.length === 0 ? (
        <p>No deals found.</p>
      ) : (
        <ul className="space-y-2">
          {deals?.map((deal) => (
            <li
              key={deal.id}
              className="p-2 bg-neutral-800 rounded-md flex flex-col md:flex-row justify-between items-start md:items-center"
            >
              <div className="text-white">
                <p>
                  <strong>Price:</strong> ${deal.agreed_price} &middot;
                  <strong> Status:</strong> {deal.status}
                </p>
                <p>
                  <strong>Seller ID:</strong> {deal.seller_id} &middot;
                  <strong>Customer ID:</strong> {deal.customer_id}
                </p>
              </div>
              <div className="text-gray-400 text-sm mt-2 md:mt-0">
                Payment Due: {new Date(deal.payment_due_date).toLocaleString()}
                <br />
                Created: {new Date(deal.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
