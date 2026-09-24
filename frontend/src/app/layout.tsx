"use client";
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const checkAuth = useAuthStore(state => state.checkAuth);
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <html lang="en" className="dark">
      <body className="bg-base text-text-primary font-sans antialiased min-h-screen selection:bg-accent-subtle overflow-x-hidden">
        {/* Subtle radial ambient gradient */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ambient via-base to-base"></div>
        {children}
      </body>
    </html>
  );
}
