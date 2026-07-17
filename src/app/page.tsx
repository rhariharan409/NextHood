'use client';

import Header from '@/components/Header';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <Header showGetStarted={true} />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--primary)',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            display: 'inline-block',
            marginBottom: '2rem'
          }}>
            Introducing Nexthood v1.0
          </span>
          <h1 className="title-hero">
            The Future of Neighborhood Commerce
          </h1>
          <p className="subtitle-hero">
            Connect customers and local businesses through an intelligent AI-powered marketplace.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/role-selection" className="btn btn-primary btn-large" style={{ boxShadow: '0 10px 20px rgba(16, 185, 129, 0.15)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </main>
      <footer style={{
        padding: '2rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div className="container">
          &copy; {new Date().getFullYear()} Nexthood. All rights reserved. Designed for local communities.
        </div>
      </footer>
    </>
  );
}
