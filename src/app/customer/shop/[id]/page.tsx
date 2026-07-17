'use client';

import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

export default function ShopPlaceholderPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;

  return (
    <>
      <Header />
      <main style={{
        flex: 1,
        padding: '3rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: 0
              }}
            >
              ← Back to Map
            </button>
          </div>

          <div className="card" style={{ padding: '3.5rem' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--primary)',
              marginBottom: '1rem',
              display: 'block'
            }}>
              Merchant Profile (Preview)
            </span>
            
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
              color: 'var(--foreground)'
            }}>
              Shop ID: {shopId}
            </h1>
            
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              marginBottom: '2.5rem'
            }}>
              This local business is located near you. You are viewing a preview representation of their shop.
            </p>

            <div style={{
              backgroundColor: 'var(--secondary)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛍️</span>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--foreground)'
              }}>
                Marketplace Integration Coming Soon
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '450px', margin: '0 auto' }}>
                In the next phase, you will be able to browse their inventory, view real-time product availability, and place orders directly.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => router.back()} className="btn btn-secondary">
                Return to Search
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
