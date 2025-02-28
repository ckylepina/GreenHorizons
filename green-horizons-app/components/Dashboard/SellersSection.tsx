// components/Dashboard/SellersSection.tsx
'use client';

import React from 'react';

interface Seller {
  id: number;
  name: string;
  seller_type: string;
  active: boolean;
  created_at: string;
}

interface SellersSectionProps {
  sellers: Seller[];
}

export default function SellersSection({ sellers }: SellersSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Sellers</h2>
      {sellers?.length === 0 ? (
        <p>No sellers found.</p>
      ) : (
        <ul className="space-y-2">
          {sellers?.map((seller) => (
            <li
              key={seller.id}
              className="p-2 bg-neutral-800 rounded-md flex justify-between items-center"
            >
              <div>
                <span className="text-white font-medium mr-2">{seller.name}</span>
                <span className="text-sm text-gray-400">
                  (Type: {seller.seller_type}, Active: {seller.active ? 'Yes' : 'No'})
                </span>
              </div>
              <div className="text-gray-400 text-sm">
                Created: {new Date(seller.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
