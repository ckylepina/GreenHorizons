// components/EditBagScanClient.tsx
'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import LabelsToPrint from '@/components/bag-entry-form/LabelsToPrint';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface GroupedBags {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

function groupBags(bags: BagRecord[]): GroupedBags[] {
  const map: Record<string, GroupedBags> = {};
  bags.forEach(bag => {
    const key = `${bag.harvest_room_id ?? 'none'}_${bag.strain_id ?? 'none'}_${bag.size_category_id ?? 'none'}_${bag.weight}`;
    if (!map[key]) {
      map[key] = { key, harvest_room_id: bag.harvest_room_id, strain_id: bag.strain_id, size_category_id: bag.size_category_id, weight: bag.weight, bags: [] };
    }
    map[key].bags.push(bag);
  });
  return Object.values(map);
}

interface EditBagScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

const EditBagScanClient: React.FC<EditBagScanClientProps> = ({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}) => {
  // scanned bags + scanner toggles
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const lastCode = useRef<string|null>(null);

  // grouping & editing state
  const groups = useMemo(() => groupBags(scannedBags), [scannedBags]);
  const [editingKey, setEditingKey] = useState<string|null>(null);
  const [editFields, setEditFields] = useState<Partial<BagRecord>>({});

  // filtered dropdowns for the edit form
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);

  // QR scan lookup
  const handleScanBag = async (qr: string) => {
    if (!qr || lastCode.current === qr) return;
    lastCode.current = qr;
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qr)
      .eq('current_status', 'in_inventory')
      .single();
    if (!error && data) {
      setScannedBags(prev => prev.some(b => b.id === data.id) ? prev : [...prev, data]);
    }
    setTimeout(() => { lastCode.current = null; }, 1000);
  };
  const handleScan = (hits: IDetectedBarcode[]) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    hits.forEach(h => h.rawValue && handleScanBag(h.rawValue));
    setTimeout(() => setIsProcessingScan(false), 1000);
  };

  // helpers to show names
  const getStrainName = (id?: string|null) => initialStrains.find(s=>s.id===id)?.name || 'Unknown';
  const getRoomName   = (id?: string|null) => initialHarvestRooms.find(r=>r.id===id)?.name || 'Unknown';
  const getSizeName   = (id?: string|null) => initialBagSizes.find(s=>s.id===id)?.name || 'Unknown';

  // when you change Harvest Room in the edit form...
  const onEditHarvestChange = (roomId: string) => {
    // reset dependent fields
    setEditFields({
      harvest_room_id: roomId,
      strain_id:       '',
      size_category_id:'',
      weight:          0,
      qr_code:         undefined,
      // keep other unchanged
    });
    // filter strains for that room
    if (roomId) {
      setFilteredStrains(
        initialStrains.filter(strain => {
          // if harvest_room_id is array
          if (Array.isArray(strain.harvest_room_id)) {
            return strain.harvest_room_id.includes(roomId);
          }
          return strain.harvest_room_id === roomId;
        })
      );
    } else {
      setFilteredStrains([]);
    }
  };

  // save edits: supabase + Zoho
  const updateGroup = async (groupKey: string, fields: Partial<BagRecord>) => {
    const group = groups.find(g=>g.key===groupKey);
    if (!group) return;
    const ids = group.bags.map(b=>b.id);

    // 1) Supabase
    const { data: updated, error } = await supabase
      .from('bags')
      .update(fields)
      .in('id', ids)
      .select();
    if (error) {
      alert('DB update error: '+error.message);
      return;
    }

    // 2) Push each to Zoho
    const harvestName = fields.harvest_room_id ? getRoomName(fields.harvest_room_id) : undefined;
    const strainName  = fields.strain_id       ? getStrainName(fields.strain_id)     : undefined;
    const sizeName    = fields.size_category_id? getSizeName(fields.size_category_id): undefined;

    await Promise.all((updated||[]).map(async bag => {
      const body: Record<string,unknown> = { sku: bag.id };
      if (strainName)      body.name        = strainName;
      if (harvestName)     body.cf_harvest  = harvestName;
      if (sizeName)        body.cf_size     = sizeName;
      if (fields.weight != null) {
        body.Weight = fields.weight;
      }
      console.log('🛠️ calling updateItem with:', body);
      await fetch('/api/zoho/updateItem', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body),
      });
    }));

    // 3) reflect locally & close editor
    setScannedBags(prev=> prev.map(b=> ids.includes(b.id)? {...b, ...fields} : b));
    setEditingKey(null);
    setEditFields({});
    alert('Saved both locally & in Zoho');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Edit Bags (Scan QR Codes)</h1>

      <button
        onClick={()=>setShowScanner(s=>!s)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {showScanner ? 'Hide Scanner' : 'Show Scanner'}
      </button>

      {showScanner && (
        <div className="mb-4">
          <Scanner
            onScan={handleScan}
            onError={console.error}
            formats={['qr_code']}
            paused={!showScanner}
            allowMultiple
          />
        </div>
      )}

      {groups.map(group => (
        <div key={group.key} className="border p-4 rounded space-y-4">
          {/* display summary */}
          <div className="flex justify-between">
            <div>
              <p><strong>Room:</strong>  {group.harvest_room_id ? getRoomName(group.harvest_room_id)   : '—'}</p>
              <p><strong>Strain:</strong>{group.strain_id        ? getStrainName(group.strain_id)          : '—'}</p>
              <p><strong>Size:</strong>  {group.size_category_id ? getSizeName(group.size_category_id)     : '—'}</p>
              <p><strong>Weight:</strong>{group.weight} lbs</p>
              <p><strong>Count:</strong> {group.bags.length}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={()=>{
                  setEditingKey(group.key);
                  setEditFields({
                    harvest_room_id:  group.harvest_room_id || '',
                    strain_id:        group.strain_id       || '',
                    size_category_id: group.size_category_id|| '',
                    weight:           group.weight,
                  });
                  // initialize filtered strains
                  if (group.harvest_room_id) {
                    onEditHarvestChange(group.harvest_room_id);
                  }
                }}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >Edit</button>
              <button
                onClick={()=>{/*printLabels*/}}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >Print Labels</button>
            </div>
          </div>

          {editingKey === group.key && (
            <div className="space-y-4">
              {/* Harvest Room */}
              <div>
                <label className="block mb-1 font-semibold">Harvest Room</label>
                <select
                  value={editFields.harvest_room_id || ''}
                  onChange={e=>onEditHarvestChange(e.target.value)}
                  className="border p-2 rounded w-full"
                >
                  <option value="">— select room —</option>
                  {initialHarvestRooms.map(r=>(
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Strain */}
              <div>
                <label className="block mb-1 font-semibold">Strain</label>
                <select
                  value={editFields.strain_id || ''}
                  onChange={e=>setEditFields(f=>({
                    ...f,
                    strain_id:e.target.value,
                    size_category_id:'',
                    weight:0,
                  }))}
                  className="border p-2 rounded w-full"
                  disabled={!editFields.harvest_room_id}
                >
                  <option value="">— select strain —</option>
                  {filteredStrains.map(s=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Bag Size */}
              <div>
                <label className="block mb-1 font-semibold">Bag Size</label>
                <select
                  value={editFields.size_category_id || ''}
                  onChange={e=>setEditFields(f=>({
                    ...f,
                    size_category_id:e.target.value,
                    weight:0,
                  }))}
                  className="border p-2 rounded w-full"
                  disabled={!editFields.strain_id}
                >
                  <option value="">— select size —</option>
                  {initialBagSizes.map(sz=>(
                    <option key={sz.id} value={sz.id}>{sz.name}</option>
                  ))}
                </select>
              </div>

              {/* Weight */}
              <div>
                <label className="block mb-1 font-semibold">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFields.weight ?? ''}
                  onChange={e=>setEditFields(f=>({
                    ...f,
                    weight: parseFloat(e.target.value)||0
                  }))}
                  className="border p-2 rounded w-full"
                  disabled={!editFields.size_category_id}
                />
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <button
                  onClick={()=>updateGroup(group.key, editFields)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  disabled={
                    !editFields.harvest_room_id ||
                    !editFields.strain_id       ||
                    !editFields.size_category_id||
                    ((editFields.weight ?? 0) <= 0)
                  }
                >Save</button>
                <button
                  onClick={()=>setEditingKey(null)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >Cancel</button>
              </div>
            </div>
          )}

          {/* hidden print area */}
          <div id={`printable-area-${group.key}`} className="hidden">
            <LabelsToPrint
              bags={group.bags}
              serverStrains={initialStrains}
              serverBagSizes={initialBagSizes}
              serverHarvestRooms={initialHarvestRooms}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EditBagScanClient;