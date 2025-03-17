'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseclient';
import ColorPicker from './ColorPicker';

interface HarvestRoom {
  id: string;
  name: string;
}

interface StrainEntry {
  strainName: string;
  color1: string;
  color2: string;
}

interface AddStrainFormProps {
  harvestRooms: HarvestRoom[];
  newHarvestRoomName: string;
}

const colorOptions = [
  { name: 'Light Red', value: '#FF6666' },
  { name: 'Red', value: '#FF0000' },
  { name: 'Dark Red', value: '#990000' },
  { name: 'Light Green', value: '#66FF66' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Dark Green', value: '#009900' },
  { name: 'Light Blue', value: '#66B2FF' },
  { name: 'Blue', value: '#0000FF' },
  { name: 'Dark Blue', value: '#000099' },
  { name: 'Light Yellow', value: '#FFFF66' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Dark Yellow', value: '#CCCC00' },
  { name: 'Light Purple', value: '#D9B3FF' },
  { name: 'Purple', value: '#800080' },
  { name: 'Dark Purple', value: '#4B0082' },
  { name: 'Light Orange', value: '#FFCC99' },
  { name: 'Orange', value: '#FFA500' },
  { name: 'Dark Orange', value: '#CC8400' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light Pink', value: '#FFB6C1' },
  { name: 'Pink', value: '#FFC0CB' },
  { name: 'Dark Pink', value: '#FF69B4' },
];

const AddStrainForm: React.FC<AddStrainFormProps> = ({ harvestRooms, newHarvestRoomName }) => {
  const router = useRouter();

  const sortedHarvestRooms = useMemo(() => {
    return [...harvestRooms].sort((a, b) => {
      const numA = parseInt(a.name.replace(/[^\d]/g, ''), 10);
      const numB = parseInt(b.name.replace(/[^\d]/g, ''), 10);
      return numB - numA;
    });
  }, [harvestRooms]);

  const [selectedHarvestRoom, setSelectedHarvestRoom] = useState(sortedHarvestRooms[0]?.id || '');
  const [isNewHarvest, setIsNewHarvest] = useState(false);
  const [strainEntries, setStrainEntries] = useState<StrainEntry[]>([
    { strainName: '', color1: colorOptions[1].value, color2: colorOptions[1].value },
  ]);

  const handleStrainChange = (index: number, field: keyof StrainEntry, value: string) => {
    const newEntries = [...strainEntries];
    newEntries[index][field] = value;
    setStrainEntries(newEntries);
  };

  const addStrainEntry = () => {
    setStrainEntries([
      ...strainEntries,
      { strainName: '', color1: colorOptions[1].value, color2: colorOptions[1].value },
    ]);
  };

  const removeStrainEntry = (index: number) => {
    setStrainEntries(strainEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let harvestRoomId = selectedHarvestRoom;

    if (isNewHarvest) {
      const { data: newRoomData, error: newRoomError } = await supabase
        .from('harvest_rooms')
        .insert([{ name: newHarvestRoomName }])
        .select()
        .single();
      if (newRoomError) {
        console.error('Error creating new harvest room:', newRoomError);
        return;
      }
      harvestRoomId = newRoomData.id;
    }

    for (const entry of strainEntries) {
      if (!entry.strainName.trim()) continue;
      const colors = [entry.color1, entry.color2];
      const { error: strainError } = await supabase
        .from('strains')
        .insert([{ name: entry.strainName, harvest_room_id: harvestRoomId, colors }]);
      if (strainError) {
        console.error(`Error adding strain ${entry.strainName}:`, strainError);
      }
    }

    alert('Strains added successfully!');
    router.push('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Strains to Harvest Room</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Harvest Room Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Harvest Room</h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedHarvestRoom}
              onChange={(e) => setSelectedHarvestRoom(e.target.value)}
              disabled={isNewHarvest}
              className={`border rounded p-2 ${isNewHarvest ? 'opacity-50' : ''}`}
            >
              {sortedHarvestRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsNewHarvest(true)}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Add New Harvest #
            </button>
          </div>
          {isNewHarvest && (
            <div className="mt-2">
              <label className="block font-medium">New Harvest Room Name</label>
              <input
                type="text"
                value={newHarvestRoomName}
                readOnly
                className="border rounded p-2 w-full"
              />
            </div>
          )}
        </div>

        {/* Strains Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Strains</h2>
          {strainEntries.map((entry, index) => (
            <div key={index} className="border p-4 rounded mb-4">
              <div className="mb-2">
                <label className="block font-medium">Strain Name</label>
                <input
                  type="text"
                  value={entry.strainName}
                  onChange={(e) => handleStrainChange(index, 'strainName', e.target.value)}
                  className="border rounded p-2 w-full"
                  placeholder="Enter strain name"
                  required
                />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Color Code 1</label>
                <ColorPicker
                  colors={colorOptions}
                  selected={entry.color1}
                  onSelect={(color) => handleStrainChange(index, 'color1', color)}
                />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Color Code 2</label>
                <ColorPicker
                  colors={colorOptions}
                  selected={entry.color2}
                  onSelect={(color) => handleStrainChange(index, 'color2', color)}
                />
              </div>
              {strainEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStrainEntry(index)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Remove Strain
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addStrainEntry}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add Another Strain
          </button>
        </div>
        <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Submit All
        </button>
      </form>
      <div className="mt-4">
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default AddStrainForm;