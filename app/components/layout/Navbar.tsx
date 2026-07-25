"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="fixed w-full z-40 bg-white/10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Image src="/logos/rainman-logo.svg" alt="Rainman Logo" width={36} height={36} className="h-12 w-40" />
            </Link>
          </div>
          <div className="flex items-center space-x-0 ml-auto">
            <Link
              href="https://youtu.be/FxEJKzEaJlM"
              className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
              target="_blank"
              rel="noopener noreferrer"
              title="Watch Walkthrough"
            >
              <Image src="/icons/youtube.svg" alt="YouTube" width={24} height={24} className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}