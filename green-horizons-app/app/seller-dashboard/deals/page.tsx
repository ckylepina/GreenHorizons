'use client';

import React, { useEffect, useState } from 'react';
import { getDeals } from '@/utils/supabase/queries';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function DealsPage() {
  // Explicitly type deals as any[] (replace any with a proper Deal type if available)
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDeals() {
      // Import and then await the creation of the Supabase client.
      const { createClient } = await import('@/utils/supabase/server');
      const supabase: SupabaseClient = await createClient();
      
      const fetchedDeals = await getDeals(supabase);
      setDeals(fetchedDeals);
    }
    fetchDeals();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Deals</h1>
      {deals.length === 0 ? (
        <p>No deals found.</p>
      ) : (
        <ul className="space-y-2">
          {deals.map((deal: any) => (
            <li key={deal.id} className="border p-2 rounded">
              <p className="text-lg">Price: ${deal.agreed_price}</p>
              <p className="text-sm">Status: {deal.status}</p>
              <p className="text-xs">Created: {new Date(deal.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
