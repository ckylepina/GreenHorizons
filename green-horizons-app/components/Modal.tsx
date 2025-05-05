'use client';

import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
      />

      {/* modal panel */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Close"
        >
          <FaTimes size={20} />
        </button>

        {/* optional title */}
        {title && (
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        )}

        {/* modal content */}
        {children}
      </div>
    </div>
  );
}
