"use client";

import AccountForm from '../components/auth/AccountForm';
import Navbar from '../components/layout/Navbar';
import ProtectedRoute from '../components/protected/ProtectedRoute';

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen midnight-sky-bg relative overflow-hidden">
        <Navbar />
        {/* Background image */}
        <div 
          className="absolute inset-0 w-full h-full z-0 bg-center bg-cover"
          style={{ backgroundImage: 'url(/images/account-bg-0.jpg)' }}
        />
        {/* Overlay for darkening image */}
        <div className="absolute inset-0 bg-black/60 z-10" />
        {/* Centered content */}
        <div className="relative z-20 pt-16 flex items-center justify-center min-h-screen">
          <AccountForm />
        </div>
      </div>
    </ProtectedRoute>
  );
} 