'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Home, Search, MessageSquare, Zap, ShoppingCart, User, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  showGetStarted?: boolean;
  currentUser?: { name: string; role: string } | null;
  onLogout?: () => void;
}

export default function Header({ showGetStarted = false, currentUser = null, onLogout }: HeaderProps) {
  const { cartCount } = useCart();
  const pathname = usePathname();

  const isCustomer = currentUser?.role === 'Customer';

  const navItems = [
    { label: 'Home', href: '/customer/home', icon: Home },
    { label: 'Smart Search', href: '/customer/smart-search', icon: Search },
    { label: 'AI Assistant', href: '/customer/ai-assistant', icon: MessageSquare },
    { label: 'FlashFest', href: '/customer/flashfest', icon: Zap },
    { label: 'Cart', href: '/customer/checkout', icon: ShoppingCart, count: cartCount },
    { label: 'Profile', href: '/customer/profile', icon: User }
  ];

  return (
    <header className="no-print" style={{
      position: 'sticky',
      top: '1.25rem',
      width: '95%',
      maxWidth: '1200px',
      margin: '0 auto 1.25rem auto',
      zIndex: 100,
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--glass-shadow)',
      borderRadius: '20px',
      transition: 'background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease'
    }}>
      <div className="container" style={{
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem'
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none',
          color: 'var(--foreground)'
        }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--primary)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            N
          </motion.div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.35rem',
            letterSpacing: '-0.02em',
            color: 'var(--foreground)'
          }}>
            NextHood
          </span>
        </Link>

        {/* Customer Middle Navigation Links */}
        {isCustomer && (
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--nav-bg)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--nav-border)',
            transition: 'background-color 300ms ease, border-color 300ms ease'
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/customer/checkout' && pathname === '/orders');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    textDecoration: 'none',
                    position: 'relative',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-bg"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        zIndex: -1
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <motion.span
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        marginLeft: '2px'
                      }}
                    >
                      {item.count}
                    </motion.span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right user context & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} className="no-print">
                Hello, <strong style={{ color: 'var(--foreground)' }}>{currentUser.name}</strong>
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </motion.button>
            </div>
          ) : showGetStarted ? (
            <Link href="/role-selection" style={{
              display: 'inline-flex',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}>
              Get Started
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
