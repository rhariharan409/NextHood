'use client';

import Header from '@/components/Header';
import Link from 'next/link';

export default function RoleSelectionPage() {
  return (
    <>
      <Header />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div className="container" style={{ maxWidth: '850px', textAlign: 'center' }}>
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              marginBottom: '1rem'
            }}>
              Choose Your Role
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              Select how you would like to experience Nexthood today
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            width: '100%'
          }}>
            {/* Customer Card */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontSize: '2rem',
                  marginBottom: '1.5rem',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  🛍️
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  color: 'var(--foreground)'
                }}>
                  Customer
                </h2>
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.975rem',
                  lineHeight: '1.5',
                  marginBottom: '2rem'
                }}>
                  Shop from trusted nearby local businesses.
                </p>
              </div>
              <Link href="/customer/auth" className="btn btn-primary" style={{ width: '100%' }}>
                Continue as Customer
              </Link>
            </div>

            {/* Seller Card */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontSize: '2rem',
                  marginBottom: '1.5rem',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  🏪
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  color: 'var(--foreground)'
                }}>
                  Seller
                </h2>
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.975rem',
                  lineHeight: '1.5',
                  marginBottom: '2rem'
                }}>
                  Manage your products and grow your local business.
                </p>
              </div>
              <Link href="/seller/auth" className="btn btn-primary" style={{ width: '100%' }}>
                Continue as Seller
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
