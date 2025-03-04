// app/ceo-dashboard/page.tsx
import { createClient } from '@/utils/supabase/server';
import CEODashboard from '@/components/CEODashboard';
import { getSales } from '@/utils/supabase/queries';

export default async function CEODashboardPage() {
  const supabase = await createClient();

  // Optionally, perform authentication checks here

  // Fetch the sales data from the sales table.
  const salesData = await getSales(supabase, {});

  // Transform SalesData into SalesRecord format.
  // Note: We set a default value of 0 for 'otherFinancial' to satisfy the SalesRecord type.
  const salesRecords = salesData.map((sale) => ({
    date: sale.sale_date,          // Map sale_date to date
    actual: sale.total_amount,     // Use total_amount as the actual value
    forecast: sale.total_amount,   // Example: using total_amount as forecast (adjust as needed)
    inflow: 0,                     // Default or computed value for inflow
    outflow: 0,                    // Default or computed value for outflow
    otherFinancial: 0,             // Default value for otherFinancial
    id: sale.id,
    tenant_id: sale.tenant_id,
    customer_id: sale.customer_id,
    customer: sale.customer,
  }));

  return <CEODashboard salesData={salesRecords} />;
}