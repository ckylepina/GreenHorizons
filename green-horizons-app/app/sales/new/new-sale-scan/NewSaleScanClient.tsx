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
  drivers_license: string; // holds the driver's license URL
};

// RPC params for creating a customer.
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
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Handle new‐customer form inputs
  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Upload signature PNG to Supabase storage, return its public URL
  const handleUploadSignature = async (): Promise<string | null> => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert("Please provide your signature.");
      return null;
    }
    setUploadingSignature(true);
    try {
      // 1) export to Data URL & convert to Blob
      const dataUrl = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();

      // 2) upload Blob
      const fileName = `signature-${Date.now()}.png`;
      const { error: uploadError } = await supabase
        .storage
        .from('signatures')
        .upload(fileName, blob, { upsert: true });
      if (uploadError) throw uploadError;

      // 3) get public URL
      const { data: urlData } = supabase
        .storage
        .from('signatures')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('❌ Signature upload error:', err);
      alert('Failed to upload signature.');
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
    console.log('🚀 handleSubmit start');

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
        alert('Please upload your driver’s license photo.');
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

    // 3) Create or lookup customer
    let customerId: string | null = null;
    if (mode === 'existing') {
      customerId = selectedCustomer!.id;
    } else {
      const params: CreateCustomerParams = {
        p_first_name:    newCustomer.first_name,
        p_last_name:     newCustomer.last_name,
        p_business_name: newCustomer.business_name,
        p_license_number:newCustomer.license_number,
        p_email:         newCustomer.email,
        p_phone:         newCustomer.phone,
        p_tenant_id:     tenantId,
        p_drivers_license:newCustomer.drivers_license,
      };
      console.log('🧪 Creating customer via RPC:', params);
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_customer', params);
      console.log('🧪 RPC create_customer returned:', rpcData, rpcError);
      if (rpcError) {
        console.error('RPC error:', rpcError);
        alert('Failed to create customer.');
        return;
      }
      customerId = Array.isArray(rpcData) && rpcData[0]?.id ? rpcData[0].id : null;
    }
    if (!customerId) {
      alert('Could not determine customer ID.');
      return;
    }

    // 4) Insert sale
    const saleDate = new Date().toISOString();
    const { data: saleRows, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id:        customerId,
        sale_date:          saleDate,
        status:             'completed',
        tenant_id:          tenantId,
        total_amount:       saleTotal,
        cash_transaction_id: null,
        signature_url:      signatureUrl,
      }])
      .select();
    if (saleError || !saleRows?.[0]) {
      console.error('Error inserting sale:', saleError);
      alert('Failed to record sale.');
      return;
    }
    const saleRecord = saleRows[0];

    // 5) Insert sale_items
    const pricePerBag = saleTotal / scannedBags.length;
    const saleItems = scannedBags.map(bag => ({
      sale_id: saleRecord.id,
      bag_id:  bag.id,
      price:   pricePerBag,
    }));
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    if (itemsError) {
      console.error('Error inserting sale_items:', itemsError);
      alert('Failed to record sale items.');
      return;
    }

    // 6) Cash transaction
    const tx = {
      tenant_id:        tenantId,
      transaction_type: 'sale' as const,
      amount:           saleTotal,
      description:      'Sale',
      transaction_date: saleDate,
      created_by:       currentEmployeeId,
      updated_by:       currentEmployeeId,
    };
    const { data: cashRows, error: cashError } = await supabase
      .from('cash_transactions')
      .insert([tx])
      .select();
    if (cashError || !cashRows?.[0]) {
      console.error('Error inserting cash transaction:', cashError);
      alert('Failed to record cash transaction.');
      return;
    }
    const cashRecord = cashRows[0];

    // 7) Update sale with cash_transaction_id
    await supabase
      .from('sales')
      .update({ cash_transaction_id: cashRecord.id })
      .eq('id', saleRecord.id);

    // 8) Mark bags sold
    await supabase
      .from('bags')
      .update({ current_status: 'sold' })
      .in('id', scannedBags.map(b => b.id));

    // 9) Redirect to invoice
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

      {/* Digital Signature */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Digital Signature</h2>
        <SignatureCanvas
          ref={signaturePadRef}
          penColor={currentTheme === 'dark' ? 'white' : 'black'}
          canvasProps={{ className: "w-full h-40 border rounded bg-transparent" }}
        />
        <button
          onClick={handleClearSignature}
          className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Clear Signature
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploadingSignature}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {uploadingSignature ? 'Uploading Signature...' : 'Submit Sale'}
      </button>
    </div>
  );
}