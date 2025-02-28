// This is a server component by default (no 'use client' directive)
import { createClient } from '@/utils/supabase/server';
import { getCashTransactions, getSafeInfo } from '@/utils/supabase/queries';
import CashTransactionsClient from './CashTransactionsClient';

export default async function CashTransactionsPage() {
  // Create the Supabase client and fetch data on the server
  const supabase = await createClient();
  const transactions = await getCashTransactions(supabase);
  const safeInfo = await getSafeInfo(supabase);

  // Pass the fetched data to the client component
  return <CashTransactionsClient transactions={transactions} safeInfo={safeInfo} />;
}
