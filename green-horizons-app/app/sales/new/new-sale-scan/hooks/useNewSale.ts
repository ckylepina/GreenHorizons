// app/sales/new/new-sale-scan/hooks/useNewSale.ts
import { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import type { Database } from '@/database.types';
import type { Customer, BagRecord } from '@/components/bag-entry-form/types';

// RPC args & return types for create_customer
type CreateCustomerArgs =
  Database['public']['Functions']['create_customer']['Args'];
type CreateCustomerReturn =
  Database['public']['Functions']['create_customer']['Returns'][0];

export interface NewSaleData {
  mode: 'existing' | 'new';
  selectedCustomer: Customer | null;
  newCustomer: {
    first_name: string;
    last_name: string;
    business_name: string;
    license_number: string;
    email: string;
    phone: string;
    drivers_license: string;
  };
  scannedBags: BagRecord[];
  saleTotal: number;
  signatureBlob: Blob;
  currentEmployeeId: string;
  tenantId: string;
}

export interface UseNewSaleResult {
  submitSale: (data: NewSaleData) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useNewSale(): UseNewSaleResult {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function submitSale(data: NewSaleData): Promise<string> {
    setLoading(true);
    setError(null);

    try {
      // 1) Create or fetch customer
      let customerId = data.selectedCustomer?.id ?? '';
      if (data.mode === 'new') {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'create_customer',
          {
            p_first_name:      data.newCustomer.first_name,
            p_last_name:       data.newCustomer.last_name,
            p_business_name:   data.newCustomer.business_name,
            p_license_number:  data.newCustomer.license_number,
            p_email:           data.newCustomer.email,
            p_phone:           data.newCustomer.phone,
            p_drivers_license: data.newCustomer.drivers_license,
            p_tenant_id:       data.tenantId,
          } as CreateCustomerArgs
        );

        if (rpcError) throw rpcError;

        // Cast to your typed return array
        const results = (rpcData ?? []) as CreateCustomerReturn[];
        if (results.length === 0) {
          throw new Error('create_customer returned no rows');
        }
        customerId = results[0].id;
      }

      // 2) Insert cash transaction
      const saleDate = new Date().toISOString();
      const { data: cashRows, error: cashError } = await supabase
        .from('cash_transactions')
        .insert([
          {
            tenant_id:        data.tenantId,
            transaction_type: 'sale' as const,
            amount:           data.saleTotal,
            description:      'Sale transaction',
            transaction_date: saleDate,
            created_by:       data.currentEmployeeId,
            updated_by:       data.currentEmployeeId,
          },
        ])
        .select();

      if (cashError || !cashRows?.length) {
        throw cashError ?? new Error('Failed to create cash transaction');
      }
      const cashId = cashRows[0].id;

      // 3) Upload signature & insert sale
      const sigFileName = `sig-${Date.now()}.png`;
      const { error: upErr } = await supabase
        .storage
        .from('signatures')
        .upload(sigFileName, data.signatureBlob);
      if (upErr) throw upErr;

      const signatureUrl = supabase
        .storage
        .from('signatures')
        .getPublicUrl(sigFileName)
        .data.publicUrl;

      const { data: saleRows, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            customer_id:         customerId,
            sale_date:           saleDate,
            status:              'completed',
            tenant_id:           data.tenantId,
            total_amount:        data.saleTotal,
            signature_url:       signatureUrl,
            cash_transaction_id: cashId,
          },
        ])
        .select();

      if (saleError || !saleRows?.length) {
        throw saleError ?? new Error('Failed to create sale record');
      }
      const saleId = saleRows[0].id;

      // 4) Insert sale_items
      const pricePerBag = data.saleTotal / data.scannedBags.length;
      await supabase
        .from('sale_items')
        .insert(
          data.scannedBags.map((b) => ({
            sale_id: saleId,
            bag_id:  b.id,
            price:   pricePerBag,
          }))
        );

      // 5) Update bag statuses
      await supabase
        .from('bags')
        .update({ current_status: 'sold' })
        .in(
          'id',
          data.scannedBags.map((b) => b.id)
        );

      return saleId;

    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { submitSale, isLoading, error };
}