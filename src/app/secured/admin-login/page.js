/* src/app/secured/admin-login/page.js */
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page simply redirects to the main login page.
// The superadmin layout handles role-based access control.
export default function AdminLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/secured/login');
  }, [router]);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Redirecting to Login...</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Please wait.</p>
      </div>
    </div>
  );
}