/* src/app/secured/login/page.js */
"use client";
import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const provider = new GoogleAuthProvider();

    try {
      // 1. Popup Google Login
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // HARDCODED SUPER ADMINS (Sync with AuthContext)
      const SUPER_ADMIN_EMAILS = [
        "coasterbox@gmail.com"
      ];
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);

      // 2. Check/Create User in Database
      const userDocRef = doc(db, "users", user.email);
      const userDoc = await getDoc(userDocRef);

      let role = 'user';

      if (!userDoc.exists()) {
        // Create new user
        // If they are in our whitelist, make them superadmin immediately
        role = isSuperAdmin ? 'superadmin' : 'user';

        await setDoc(userDocRef, {
          email: user.email,
          name: user.displayName,
          role: role,
          photo: user.photoURL,
          createdAt: new Date()
        });
      } else {
        // Doc exists
        const data = userDoc.data();
        role = data.role;

        // OPTIONAL: Force upgrade existing users if they are in the whitelist
        if (isSuperAdmin && role !== 'superadmin') {
          await setDoc(userDocRef, { ...data, role: 'superadmin' }, { merge: true });
          role = 'superadmin';
        }
      }

      // 3. Redirect based on Role
      if (role === 'superadmin') router.push('/secured/superadmin/');
      else if (role === 'artisan') router.push('/secured/artisan/dashboard');
      else router.push('/shop'); // Customers go here

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add costerbox.in to Firebase Console > Auth > Settings.');
      } else {
        setError(`Google Sign-In failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center', position: 'relative' }}>

        <Link href="/" style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#666', fontSize: '14px' }}>
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Ensure logo.png exists in /public folder */}
        <img src="/logo.png" alt="Logo" style={{ height: '50px', margin: '0 auto 20px', display: 'block', mixBlendMode: 'multiply' }} />

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#111' }}>Welcome Back</h1>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>Access your orders and saved items</p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#fff',
            border: '1px solid #ddd',
            color: '#333',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#f5f5f5')}
          onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#fff')}
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p style={{ marginTop: '30px', fontSize: '12px', color: '#999' }}>
          By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}