'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface User {
  id: string;
  email: string;
  role: string;
  name: string; // business_name
}

export default function SellerHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/seller/auth');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user.role === 'seller') {
          setUser(data.user);
        } else {
          router.push('/seller/auth');
        }
      } catch (err) {
        router.push('/seller/auth');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family)',
        color: 'var(--text-muted)'
      }}>
        Loading your Nexthood seller profile...
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Seller' }} onLogout={handleLogout} />
      <main style={{
        flex: 1,
        padding: '4rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="card" style={{ textAlign: 'left', padding: '3.5rem' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--primary)',
              marginBottom: '1rem',
              display: 'block'
            }}>
              Seller Business Portal
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              lineHeight: 1.2
            }}>
              Welcome, {user.name}
            </h1>
            <p style={{
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: 'var(--text-muted)',
              marginBottom: '2.5rem',
              maxWidth: '550px'
            }}>
              You have successfully logged in to your merchant account. Here you will be able to manage your local business and products in future phases.
            </p>

            <div style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Business Profile:</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: '0.5rem',
                fontSize: '0.95rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Business Name:</span>
                <span style={{ fontWeight: 500 }}>{user.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>Owner Email:</span>
                <span style={{ fontWeight: 500 }}>{user.email}</span>
                <span style={{ color: 'var(--text-muted)' }}>Seller ID:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{user.id}</span>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Verified merchant</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
