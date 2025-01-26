import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers'; // Required for Supabase auth in server components

// Create Supabase client for server-side
const supabase = createClient({ cookies });

// Fetch strain options from the database
export async function getStrains() {
  const { data, error } = await supabase.from('strains').select('id, strain_name');
  if (error) throw new Error(`Error fetching strains: ${error.message}`);
  return data;
}

// Insert bag data into the database
export async function insertBag(bagData: {
  bag_id: string;
  strain_id: string;
  weight: number;
  type: string;
  harvest: string;
}) {
  const { data, error } = await supabase.from('bags').insert(bagData);
  if (error) throw new Error(`Error inserting bag: ${error.message}`);
  return data;
}
