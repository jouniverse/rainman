'use client';

import { useState } from 'react';
import SidePanel from './SidePanel';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

interface CollapsibleSidePanelProps {
  children: React.ReactNode;
  selectedLocation: {
    lat: number;
    lng: number;
    zip: string;
    countyFIPS: string;
    state?: string;
    city?: string;
  };
  setSelectedLocation: React.Dispatch<React.SetStateAction<{
    lat: number;
    lng: number;
    zip: string;
    countyFIPS: string;
    state?: string;
    city?: string;
  }>>;
}

export default function CollapsibleSidePanel({ children, selectedLocation, setSelectedLocation }: CollapsibleSidePanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Determine button position
  const buttonPosition = isOpen
    ? 'right-0 md:left-[24rem] md:right-auto'
    : 'left-0';

  return (
    <div className="flex h-screen pt-16">
      <div
        className={`relative transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'md:w-96 w-full' : 'w-0'
        }`}
      >
        <SidePanel
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
        />
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-20 z-50 midnight-sky-bg p-2 rounded-lg hover:bg-black/70 transition-colors ${buttonPosition}`}
      >
        {isOpen ? (
          <ChevronLeftIcon className="h-6 w-6 text-white" />
        ) : (
          <ChevronRightIcon className="h-6 w-6 text-white" />
        )}
      </button>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
} 