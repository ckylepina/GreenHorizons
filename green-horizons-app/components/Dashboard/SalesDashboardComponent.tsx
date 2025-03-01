'use client';

import React from 'react';

interface SalesDashboardUser {
  id: string;
  email: string;
}

interface SalesDashboardComponentProps {
  user: SalesDashboardUser;
}

export default function SalesDashboardComponent({
  user,
}: SalesDashboardComponentProps) {
  // Removed unused state variables (saleBasket, scanningError)

  const handleSubmitSale = async (): Promise<void> => {
    // Implement sale submission logic:
    // e.g., update bag status to "picked"/"sold", create sale record, etc.
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Sales Dashboard</h1>
      <p>Welcome, {user.email}</p>
      
      <section className="my-4">
        <h2 className="text-2xl font-semibold mb-2">Scan Items for Sale</h2>
        {/* Scanner component would be integrated here */}
      </section>

      <section className="my-4">
        <h2 className="text-2xl font-semibold mb-2">Sale Basket</h2>
        <p>No items scanned yet.</p>
      </section>

      <button 
        onClick={handleSubmitSale}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit Sale
      </button>
    </div>
  );
}