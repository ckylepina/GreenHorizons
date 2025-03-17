'use client';

import React, { useState } from 'react';

interface Color {
  name: string;
  value: string;
}

interface ColorPickerProps {
  colors: Color[];
  selected: string;
  onSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ colors, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-300 flex items-center justify-center"
        style={{ backgroundColor: selected }}
      >
        <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-2 bg-white border border-gray-300 rounded shadow-lg p-3 w-[13.5rem]">
          <div className="grid grid-cols-4 gap-8">
            {colors.map((color) => (
              <div
                key={color.value}
                onClick={() => {
                  onSelect(color.value);
                  setIsOpen(false);
                }}
                className={`w-6 h-6 rounded cursor-pointer border ${
                  selected === color.value ? 'border-black' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;