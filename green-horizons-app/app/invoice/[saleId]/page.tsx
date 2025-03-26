import { createClient } from '@/utils/supabase/server';
import Invoice, { InvoiceData } from '@/app/sales/new/new-sale-scan/Invoice';

// Define a type for sale_items to remove explicit "any"
interface SaleItem {
  bag_id: string;
  price: number;
}

// Define PageProps with params and searchParams as Promises.
export interface PageProps {
  params: Promise<{ saleId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] }>;
}

export default async function InvoicePage({ params }: PageProps) {
  // Await the params to extract saleId
  const { saleId } = await params;

  const supabase = await createClient();

  // Fetch the sale record including customer details and sale_items.
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .select(`
      id,
      sale_date,
      total_amount,
      customer:customers (
        first_name,
        last_name,
        email,
        business_name,
        license_number,
        phone
      ),
      sale_items (
        bag_id,
        price
      )
    `)
    .eq('id', saleId)
    .single();

  if (saleError || !saleData) {
    return <div>Error loading invoice: {saleError?.message || "Sale not found"}</div>;
  }

  // Get bag IDs from sale_items using the SaleItem type.
  const saleItems = saleData.sale_items as SaleItem[] | undefined;
  const bagIds = saleItems ? saleItems.map((item) => item.bag_id) : [];

  // Fetch bag details for these IDs.
  const { data: bags, error: bagsError } = await supabase
    .from('bags')
    .select('*')
    .in('id', bagIds);

  if (bagsError) {
    return <div>Error loading bags: {bagsError.message}</div>;
  }

  const invoiceData: InvoiceData = {
    customer: Array.isArray(saleData.customer) ? saleData.customer[0] : saleData.customer,
    scannedBags: bags || [],
    saleTotal: saleData.total_amount,
    date: new Date(saleData.sale_date).toLocaleString(),
  };

  // Fetch lookup data.
  const { data: strains } = await supabase.from('strains').select('*');
  const { data: bagSizes } = await supabase.from('bag_size_categories').select('*');
  const { data: harvestRooms } = await supabase.from('harvest_rooms').select('*');

  return (
    <Invoice
      invoiceData={invoiceData}
      initialStrains={strains ?? []}
      initialBagSizes={bagSizes ?? []}
      initialHarvestRooms={harvestRooms ?? []}
    />
  );
}