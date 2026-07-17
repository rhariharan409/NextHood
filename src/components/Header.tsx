'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  showGetStarted?: boolean;
  currentUser?: { name: string; role: string } | null;
  onLogout?: () => void;
}

import { useCart } from '@/context/CartContext';

export default function Header({ showGetStarted = false, currentUser = null, onLogout }: HeaderProps) {
  const { cartCount } = useCart();

  return (
    <header className="header">
      <div className="container header-container">
        <Link href="/" className="logo-group">
          <div className="logo-icon">N</div>
          <span>Nexthood</span>
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {currentUser && currentUser.role === 'Customer' && cartCount > 0 && (
            <Link href="/customer/checkout" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <span>🛒</span>
              <span>Cart ({cartCount})</span>
            </Link>
          )}

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                Logged in as <strong style={{ color: 'var(--primary)' }}>{currentUser.name}</strong> ({currentUser.role})
              </span>
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          ) : showGetStarted ? (
            <Link href="/role-selection" className="btn btn-primary">
              Get Started
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
