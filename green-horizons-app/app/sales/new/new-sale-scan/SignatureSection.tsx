// app/sales/new/new-sale-scan/SignatureSection.tsx
'use client';

import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useTheme } from 'next-themes';

export interface SignatureSectionHandle {
  getSignatureDataUrl(): string | undefined;
}

const SignatureSection = forwardRef<SignatureSectionHandle>((_, ref) => {
  const padRef = useRef<SignatureCanvas>(null);
  const { theme } = useTheme();

  useImperativeHandle(ref, () => ({
    getSignatureDataUrl: () => padRef.current?.toDataURL('image/png'),
  }));

  return (
    <div className="border p-4 rounded">
      <h2 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">
        Digital Signature
      </h2>
      <SignatureCanvas
        ref={padRef}
        penColor={theme === 'dark' ? '#fff' : '#000'}
        canvasProps={{ width: 600, height: 200, className: 'w-full border' }}
      />
      <button
        type="button"
        onClick={() => padRef.current?.clear()}
        className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Clear Signature
      </button>
    </div>
  );
});

// Add a display name for React DevTools and to satisfy react/display-name
SignatureSection.displayName = 'SignatureSection';

export default SignatureSection;