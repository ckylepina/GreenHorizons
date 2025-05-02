// app/inventory/check-in/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/utils/supabase/queries';
import CheckInScannerClient from '@/components/Inventory/CheckIn/CheckInScannerClient';

export default async function CheckInPage() {
  const supabase = await createClient();

  // Require login
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Check-In</h1>
      <CheckInScannerClient />
    </main>
  );
}
