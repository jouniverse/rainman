"use client";

import RegisterForm from '../components/auth/RegisterForm';
import Navbar from '../components/layout/Navbar';

export default function RegisterPage() {
  return (
    <div className="min-h-screen midnight-sky-bg relative overflow-hidden">
      <Navbar />
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="/video/rainman-register-splash.mp4"
      />
      {/* Overlay for darkening video */}
      <div className="absolute inset-0 bg-black/60 z-10" />
      {/* Centered content */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <RegisterForm />
      </div>
    </div>
  );
} 