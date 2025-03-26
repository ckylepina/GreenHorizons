'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import { useRouter } from 'next/navigation';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import type { Database } from '@/database.types';

// Props for the client component.
interface NewSaleScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
  currentEmployeeId: string;
  tenantId: string;
}

// Define a type for customer details.
export type CustomerDetails = {
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  license_number: string;
  phone: string;
};

// Local type for RPC parameters (for creating a customer).
interface CreateCustomerParams {
  p_first_name: string;
  p_last_name: string;
  p_business_name: string;
  p_license_number: string;
  p_email: string;
  p_phone: string;
  p_tenant_id: string;
}

export default function NewSaleScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
  currentEmployeeId,
  tenantId,
}: NewSaleScanClientProps) {
  const router = useRouter();

  // --- Customer State ---
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<CustomerDetails>({
    first_name: '',
    last_name: '',
    business_name: '',
    license_number: '',
    email: '',
    phone: '',
  });

  // --- Bag Scanner State ---
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal] = useState<number>(0);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer info.
    if (mode === 'existing') {
      if (!selectedCustomer) {
        alert('Please select an existing customer.');
        return;
      }
    } else {
      if (!newCustomer.first_name || !newCustomer.last_name || !newCustomer.email) {
        alert('Please fill in required customer details for a new customer.');
        return;
      }
    }
    if (scannedBags.length === 0) {
      alert('Please scan at least one bag.');
      return;
    }
    if (saleTotal <= 0) {
      alert('Please set a price per bag for all groups.');
      return;
    }

    // --- Step 1: Create or Retrieve Customer ---
    let customerId: string | null = null;
    if (mode === 'existing') {
      customerId = selectedCustomer?.id || null;
    } else {
      const params: CreateCustomerParams = {
        p_first_name: newCustomer.first_name,
        p_last_name: newCustomer.last_name,
        p_business_name: newCustomer.business_name,
        p_license_number: newCustomer.license_number,
        p_email: newCustomer.email,
        p_phone: newCustomer.phone,
        p_tenant_id: tenantId,
      };
      console.log("Creating customer with params:", params);
      const { data, error } = await supabase.rpc<
        "create_customer",
        Database["public"]["Functions"]["create_customer"]
      >(
        "create_customer",
        params as Database["public"]["Functions"]["create_customer"]["Args"]
      );
      console.log("RPC create_customer response:", { data, error });
      if (error) {
        console.error('Error creating customer:', error);
        alert('There was an error creating the customer.');
        return;
      }
      if (data && Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'id' in data[0]) {
        customerId = (data[0] as { id: string }).id;
      } else {
        customerId = null;
      }
    }
    if (!customerId) {
      alert('Customer ID is missing.');
      return;
    }

    // --- Step 2: Insert Sale Record ---
    const saleDate = new Date().toISOString();
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id: customerId,
        sale_date: saleDate,
        status: 'completed',
        tenant_id: tenantId,
        total_amount: saleTotal,
        cash_transaction_id: null,
      }])
      .select();
    if (saleError) {
      console.error('Error inserting sale:', saleError);
      alert('Error recording sale.');
      return;
    }
    const saleRecord = saleData[0];

    // --- Step 3: Insert Sale Items ---
    const pricePerBag = saleTotal / scannedBags.length;
    const saleItems = scannedBags.map((bag) => ({
      sale_id: saleRecord.id,
      bag_id: bag.id,
      price: pricePerBag,
    }));
    const { error: saleItemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    if (saleItemsError) {
      console.error('Error inserting sale items:', saleItemsError);
      alert('Error recording sale items.');
      return;
    }

    // --- Step 4: Insert Cash Transaction ---
    const cashTransaction = {
      tenant_id: tenantId,
      transaction_type: "sale" as const,
      amount: saleTotal,
      description: 'Sale transaction',
      transaction_date: saleDate,
      created_by: currentEmployeeId,
      updated_by: currentEmployeeId,
    };
    const { data: cashData, error: cashError } = await supabase
      .from('cash_transactions')
      .insert([cashTransaction])
      .select();
    if (cashError) {
      console.error('Error inserting cash transaction:', cashError);
      alert('Error recording cash transaction.');
      return;
    }
    const cashRecord = cashData[0];

    // --- Step 5: Update Sale Record with Cash Transaction ID ---
    const { error: updateSaleError } = await supabase
      .from('sales')
      .update({ cash_transaction_id: cashRecord.id })
      .eq('id', saleRecord.id);
    if (updateSaleError) {
      console.error('Error updating sale record:', updateSaleError);
      alert('Error updating sale record.');
      return;
    }

    // --- Step 6: Update Bags Status to "sold" ---
    const bagIds = scannedBags.map(bag => bag.id);
    const { error: updateBagsError } = await supabase
      .from('bags')
      .update({ current_status: 'sold' })
      .in('id', bagIds);
    if (updateBagsError) {
      console.error('Error updating bag status:', updateBagsError);
      alert('Error updating bag status.');
      return;
    }

    // --- Step 7: Redirect to Invoice Page ---
    // Redirect to a separate invoice page using the sale ID.
    router.push(`/invoice/${saleRecord.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>
      <CustomerSection
        mode={mode}
        setMode={setMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        // Implement searchResults inside CustomerSection.
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        newCustomer={newCustomer}
        handleNewCustomerChange={handleNewCustomerChange}
      />
      <BagScannerSection
        initialStrains={initialStrains}
        initialBagSizes={initialBagSizes}
        initialHarvestRooms={initialHarvestRooms}
        onBagsChange={setScannedBags}
        onTotalChange={setSaleTotal}
      />
      <button
        type="submit"
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Submit Sale
      </button>
    </div>
  );
}