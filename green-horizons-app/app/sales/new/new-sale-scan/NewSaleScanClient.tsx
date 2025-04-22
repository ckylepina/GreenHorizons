'use client';

import React, { useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import { useRouter } from 'next/navigation';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import type { Database } from '@/database.types';
import SignatureCanvas from 'react-signature-canvas';
import { useTheme } from 'next-themes';

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
  drivers_license: string; // holds the driver's license public URL
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
  p_drivers_license: string;
}

export default function NewSaleScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
  currentEmployeeId,
  tenantId,
}: NewSaleScanClientProps) {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === 'system' ? resolvedTheme : theme;

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
    drivers_license: '',
  });

  // --- Bag Scanner State ---
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal] = useState<number>(0);

  // --- Digital Signature State ---
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [uploadingSignature, setUploadingSignature] = useState<boolean>(false);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  // Upload the digital signature from the canvas.
  const handleUploadSignature = async (): Promise<string | null> => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert("Please provide your signature.");
      return null;
    }
    setUploadingSignature(true);
    try {
      const dataUrl = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `signature-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (error: unknown) {
      console.error('❌ Signature upload error:', error);
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Signature upload failed: ${message}`);
      return null;
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔔 handleSubmit start');

    try {
      // --- Signature ---
      console.log('— uploading signature…');
      const signatureUrl = await handleUploadSignature();
      if (!signatureUrl) throw new Error('Signature upload cancelled');
      console.log('— got signature URL:', signatureUrl);

      // --- Customer create/retrieve ---
      let customerId: string | null = null;
      if (mode === 'existing') {
        if (!selectedCustomer) {
          throw new Error('No existing customer selected');
        }
        customerId = selectedCustomer.id;
        console.log('— using existing customer ID:', customerId);
      } else {
        console.log('— creating new customer with:', newCustomer);
        const params: CreateCustomerParams = {
          p_first_name: newCustomer.first_name,
          p_last_name: newCustomer.last_name,
          p_business_name: newCustomer.business_name,
          p_license_number: newCustomer.license_number,
          p_email: newCustomer.email,
          p_phone: newCustomer.phone,
          p_tenant_id: tenantId,
          p_drivers_license: newCustomer.drivers_license,
        };

        const {
          data: rpcData,
          error: rpcError,
        } = await supabase.rpc<
          'create_customer',
          Database['public']['Functions']['create_customer']
        >('create_customer', params as Database['public']['Functions']['create_customer']['Args']);

        if (rpcError) throw rpcError;
        if (!Array.isArray(rpcData) || rpcData.length === 0 || typeof rpcData[0] !== 'object' || !('id' in rpcData[0])) {
          throw new Error('Unexpected RPC create_customer result');
        }
        customerId = (rpcData[0] as { id: string }).id;
        console.log('— new customer ID:', customerId);
      }

      // --- Insert sale record ---
      console.log('— inserting sale record…');
      const saleDate = new Date().toISOString();
      const {
        data: saleRows,
        error: saleError,
      } = await supabase
        .from('sales')
        .insert([{
          customer_id: customerId!,
          sale_date: saleDate,
          status: 'completed',
          tenant_id: tenantId,
          total_amount: saleTotal,
          cash_transaction_id: null,
          signature_url: signatureUrl,
        }])
        .select();

      if (saleError) throw saleError;
      if (!saleRows || saleRows.length === 0) throw new Error('Sale insert returned no rows');
      const saleRecord = saleRows[0];
      console.log('— sale record:', saleRecord);

      // --- Insert sale items ---
      console.log('— inserting sale items…');
      const pricePerBag = saleTotal / scannedBags.length;
      const saleItems = scannedBags.map((bag) => ({
        sale_id: saleRecord.id,
        bag_id: bag.id,
        price: pricePerBag,
      }));
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
      if (itemsError) throw itemsError;
      console.log('— sale items inserted');

      // --- Insert cash transaction ---
      console.log('— inserting cash transaction…');
      const cashTxn = {
        tenant_id: tenantId,
        transaction_type: 'sale' as const,
        amount: saleTotal,
        description: 'Sale transaction',
        transaction_date: saleDate,
        created_by: currentEmployeeId,
        updated_by: currentEmployeeId,
      };
      const {
        data: cashRows,
        error: cashError,
      } = await supabase
        .from('cash_transactions')
        .insert([cashTxn])
        .select();
      if (cashError) throw cashError;
      if (!cashRows || cashRows.length === 0) throw new Error('Cash transaction insert returned no rows');
      const cashRecord = cashRows[0];
      console.log('— cash transaction record:', cashRecord);

      // --- Link sale → cash transaction ---
      console.log('— linking sale to cash transaction…');
      const { error: linkError } = await supabase
        .from('sales')
        .update({ cash_transaction_id: cashRecord.id })
        .eq('id', saleRecord.id);
      if (linkError) throw linkError;
      console.log('— sale record updated with cash_transaction_id');

      // --- Update bag statuses to “sold” ---
      console.log('— marking bags as sold…');
      const bagIds = scannedBags.map((b) => b.id);
      const { error: bagError } = await supabase
        .from('bags')
        .update({ current_status: 'sold' })
        .in('id', bagIds);
      if (bagError) throw bagError;
      console.log('— bag statuses updated');

      // --- Done! redirect to invoice page ---
      console.log('🎉 All steps complete — redirecting…');
      router.push(`/invoice/${saleRecord.id}`);
    } catch (error: unknown) {
      console.error('❌ handleSubmit error:', error);
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Error during sale submission: ${message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>

      <CustomerSection
        mode={mode}
        setMode={setMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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

      {/* Digital Signature Section */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Digital Signature (Required)</h2>
        <SignatureCanvas
          ref={signaturePadRef}
          penColor={currentTheme === 'dark' ? 'white' : 'black'}
          canvasProps={{ className: "w-full h-40 border rounded bg-transparent" }}
        />
        <button
          type="button"
          onClick={handleClearSignature}
          className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Clear Signature
        </button>
      </div>

      <button
        type="submit"
        disabled={uploadingSignature}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {uploadingSignature ? 'Uploading Signature...' : 'Submit Sale'}
      </button>
    </form>
  );
}