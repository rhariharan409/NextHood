'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

export default function SellerAuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        // Seller Login
        const res = await fetch('/api/auth/seller/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Login failed.');
        } else {
          setSuccess('Login successful! Redirecting...');
          setTimeout(() => {
            router.push('/seller/home');
            router.refresh();
          }, 1000);
        }
      } else {
        // Seller Sign Up
        const res = await fetch('/api/auth/seller/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName,
            ownerName,
            email,
            password,
            confirmPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Signup failed.');
        } else {
          setSuccess('Business account created! Please log in.');
          // Switch to login tab and clear signup inputs
          setTimeout(() => {
            setIsLogin(true);
            setConfirmPassword('');
            setPassword('');
            setError('');
            setSuccess('');
          }, 1500);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem'
            }}>
              {isLogin ? 'Seller Portal' : 'Register your Business'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {isLogin ? 'Log in to manage your local shop' : 'Start selling on Nexthood'}
            </p>
          </div>

          <div className="card">
            {error && <div className="message message-error">{error}</div>}
            {success && <div className="message message-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="businessName">Business Name</label>
                    <input
                      id="businessName"
                      type="text"
                      className="form-input"
                      placeholder="Green Valley Grocers"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="ownerName">Owner Name</label>
                    <input
                      id="ownerName"
                      type="text"
                      className="form-input"
                      placeholder="Jane Smith"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Business Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="contact@business.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', height: '48px' }}
                disabled={loading}
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In as Seller' : 'Register Business'}
              </button>
            </form>

            <div style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'var(--text-muted)'
            }}>
              {isLogin ? (
                <>
                  Want to register a business?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setSuccess('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                      setSuccess('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link href="/role-selection" style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              fontWeight: 500
            }}>
              ← Back to role selection
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
