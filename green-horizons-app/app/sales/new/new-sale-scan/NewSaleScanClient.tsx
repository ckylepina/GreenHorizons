'use client';

import React, { useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import { useRouter } from 'next/navigation';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
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
  drivers_license: string; // public URL
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

  // Customer state
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

  // Bag scanner & sale total
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal] = useState(0);

  // Signature
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  // Upload signature to Supabase Storage
  const handleUploadSignature = async (): Promise<string | null> => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert('Please provide your signature.');
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

      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      alert((err as Error).message);
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

    // 1) Validate customer
    if (mode === 'existing') {
      if (!selectedCustomer) {
        alert('Please select an existing customer.');
        return;
      }
    } else {
      if (!newCustomer.first_name || !newCustomer.last_name || !newCustomer.email) {
        alert('Please fill in required customer details.');
        return;
      }
      if (!newCustomer.drivers_license) {
        alert('Please upload your driver’s license.');
        return;
      }
    }
    if (scannedBags.length === 0) {
      alert('Please scan at least one bag.');
      return;
    }
    if (saleTotal <= 0) {
      alert('Please set a price per bag.');
      return;
    }

    // 2) Upload signature
    const signatureUrl = await handleUploadSignature();
    if (!signatureUrl) return;

    // 3) Create or look up customer via RPC
    let customerId: string | null = null;
    if (mode === 'existing') {
      customerId = selectedCustomer!.id;
    } else {
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
      console.log('Creating customer with params:', params);

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_customer', params);

      console.log('RPC create_customer response:', { rpcData, rpcError });
      if (rpcError) {
        alert('Error creating customer: ' + rpcError.message);
        return;
      }
      // rpcData is typed as Database["public"]["Functions"]["create_customer"]["Returns"]
      customerId = Array.isArray(rpcData) && rpcData.length > 0
        ? (rpcData[0] as { id: string }).id
        : null;
    }
    if (!customerId) {
      alert('Customer ID missing.');
      return;
    }

    // 4) Insert sale record
    const saleDate = new Date().toISOString();
    const { data: saleRows, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id: customerId,
        sale_date: saleDate,
        status: 'completed',
        tenant_id: tenantId,
        total_amount: saleTotal,
        cash_transaction_id: null,
        signature_url: signatureUrl,
      }])
      .select();
    if (saleError || !saleRows?.length) {
      alert('Error recording sale: ' + saleError?.message);
      return;
    }
    const saleRecord = saleRows[0];

    // 5) Insert sale items
    const pricePerBag = saleTotal / scannedBags.length;
    const saleItems = scannedBags.map(bag => ({
      sale_id: saleRecord.id,
      bag_id: bag.id,
      price: pricePerBag,
    }));
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    if (itemsError) {
      alert('Error recording sale items: ' + itemsError.message);
      return;
    }

    // 6) Create cash transaction
    const transaction = {
      tenant_id: tenantId,
      transaction_type: 'sale' as const,
      amount: saleTotal,
      description: 'Sale',
      transaction_date: saleDate,
      created_by: currentEmployeeId,
      updated_by: currentEmployeeId,
    };
    const { data: cashRows, error: cashError } = await supabase
      .from('cash_transactions')
      .insert([transaction])
      .select();
    if (cashError || !cashRows?.length) {
      alert('Error recording cash transaction: ' + cashError?.message);
      return;
    }
    const cashRecord = cashRows[0];

    // 7) Link cash transaction to sale
    await supabase
      .from('sales')
      .update({ cash_transaction_id: cashRecord.id })
      .eq('id', saleRecord.id);

    // 8) Mark bags as sold
    const bagIds = scannedBags.map(b => b.id);
    await supabase
      .from('bags')
      .update({ current_status: 'sold' })
      .in('id', bagIds);

    // 9) Navigate to invoice
    router.push(`/invoice/${saleRecord.id}`);
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

      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Digital Signature</h2>
        <SignatureCanvas
          ref={signaturePadRef}
          penColor={currentTheme === 'dark' ? 'white' : 'black'}
          canvasProps={{ className: 'w-full h-40 border rounded bg-transparent' }}
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
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {uploadingSignature ? 'Uploading Signature…' : 'Submit Sale'}
      </button>
    </form>
  );
}