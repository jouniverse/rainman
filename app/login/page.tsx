"use client";

import LoginForm from '../components/auth/LoginForm';
import Navbar from '../components/layout/Navbar';

export default function LoginPage() {
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
        src="/video/rainman-login-splash.mp4"
      />
      {/* Overlay for darkening video */}
      <div className="absolute inset-0 bg-black/60 z-10" />
      {/* Centered content */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <LoginForm />
      </div>
    </div>
  );
} 