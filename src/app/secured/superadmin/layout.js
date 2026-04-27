/* src/app/secured/superadmin/layout.js */
"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SuperAdminLayout({ children }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // 1. If Firebase is still loading, do nothing. Wait.
    if (loading) return;

    // 2. If Firebase finished loading, but there's no user, kick to login.
    if (!user) {
      router.push('/secured/login');
      return;
    }

    // DEBUG LOGGING
    console.log("SuperAdmin Layout Check:", { email: user.email, role, loading });

    // 3. If there is a user, check their role.
    if (role && role !== 'superadmin') {
      setAccessDenied(true);
    }
  }, [user, role, loading, router]);

  // --- LOADING / UNAUTHORIZED STATE ---
  if (accessDenied) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
          <h2 style={{ color: '#d32f2f', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#555', marginBottom: '20px' }}>You do not have permission to view this page.</p>

          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'left', fontSize: '13px', color: '#333', marginBottom: '20px' }}>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Current Role:</strong> {role || 'None'}</p>
            <p><strong>Required Role:</strong> superadmin</p>
          </div>

          <Link href="/" style={{ padding: '10px 20px', background: '#333', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading || (!accessDenied && role !== 'superadmin')) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Verifying Secure Access...</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>Please wait while we check your credentials.</p>
        </div>
      </div>
    );
  }

  // --- AUTHORIZED STATE (The actual layout) ---
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f8', fontFamily: 'sans-serif' }}>

      {/* --- SIDEBAR --- */}
      <aside style={{ width: '260px', background: '#1a1a1a', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px', flexShrink: 0 }}>

        <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold', letterSpacing: '1px' }}>COSTERBOX</h2>
          <span style={{ fontSize: '12px', color: '#888' }}>SuperAdmin Panel</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link href="/secured/superadmin/home" style={styles.link}>🏠 Home Setup</Link>
          <Link href="/secured/superadmin" style={styles.link}>📊 Dashboard</Link>
          <Link href="/secured/superadmin/categories" style={styles.link}>📂 Categories</Link>
          <Link href="/secured/superadmin/manage-products" style={styles.link}>📦 Inventory</Link>
          <Link href="/secured/superadmin/orders" style={styles.link}>🛒 Orders</Link>
          <Link href="/secured/superadmin/team" style={styles.link}>🎨 Artisans & Payouts</Link>
          <Link href="/secured/superadmin/shipping" style={styles.link}>🚚 Shipping</Link>
          <Link href="/secured/superadmin/live-chats" style={styles.link}>💬 Live Chats</Link>
          <Link href="/secured/superadmin/blog" style={styles.link}>📝 Blog</Link>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Logged in as:</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '30px' }}>
        {children}
      </main>

    </div>
  );
}

const styles = {
  link: {
    textDecoration: 'none',
    color: '#e0e0e0',
    padding: '12px 15px',
    borderRadius: '8px',
    fontSize: '14px',
    transition: '0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }
};