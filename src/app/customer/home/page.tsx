'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Business, BusinessSearchService } from '@/lib/businessSearch';
import Header from '@/components/Header';
import { Search, MapPin, Star, Clock, Compass, Grid, Sparkles, AlertCircle, Mic, Store, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Load Leaflet Map dynamically to avoid SSR "window is not defined" error
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

export default function CustomerHomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // GPS Coordinates
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Search and Business Data
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedBusinessProducts, setSelectedBusinessProducts] = useState<any[]>([]);
  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<any | null>(null);

  const searchExamples = [
    { label: 'All Shops', query: '' },
    { label: 'Restaurant', query: 'Restaurant' },
    { label: 'Cafe', query: 'Cafe' },
    { label: 'Pharmacy', query: 'Pharmacy' },
    { label: 'Vegetables', query: 'Vegetables' },
    { label: 'Electronics', query: 'Electronics' },
    { label: 'Groceries', query: 'Groceries' }
  ];

  // 1. Authenticate user
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/customer/auth');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user.role === 'customer') {
          setUser(data.user);
        } else {
          router.push('/customer/auth');
        }
      } catch (err) {
        router.push('/customer/auth');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Geolocation Setup
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords({ lat, lon });
        setLocationLoading(false);
      },
      (error) => {
        console.error('[DEBUG] Geolocation error:', error);
        setLocationError(
          'Location access denied. Please enable location permissions in your browser to discover nearby local businesses.'
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // 3. Search Handler
  const handleSearch = async (isInit = false, forceQuery?: string) => {
    const q = forceQuery !== undefined ? forceQuery : searchQuery;
    if (!coords) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await BusinessSearchService.search(coords.lat, coords.lon, q);
      setBusinesses(results);
      if (results.length > 0 && isInit) {
        setSelectedBusiness(results[0]);
      }
    } catch (err: any) {
      console.error(err);
      setSearchError('Failed to fetch nearby shops. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Trigger search on coordinates loading
  useEffect(() => {
    if (coords) {
      handleSearch(true);
    }
  }, [coords]);

  // Load shop details overlay information
  useEffect(() => {
    if (!selectedBusiness) {
      setSelectedBusinessDetails(null);
      setSelectedBusinessProducts([]);
      return;
    }

    async function loadDetails() {
      try {
        const res = await fetch(`/api/places/details?id=${selectedBusiness?.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            setSelectedBusinessDetails(data.business);
          }
          if (data.products) {
            setSelectedBusinessProducts(data.products);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDetails();
  }, [selectedBusiness]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoiceInputSimulate = () => {
    const textToType = 'Fresh Organic Apples';
    let index = 0;
    const timer = setInterval(() => {
      if (index < textToType.length) {
        setSearchQuery(textToType.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        handleSearch(false, textToType);
      }
    }, 60);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <div className="shimmer" style={{ height: '72px', width: '100%' }}></div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="shimmer skeleton-title" style={{ height: '40px', width: '80%' }}></div>
            <div className="shimmer skeleton-text" style={{ height: '20px' }}></div>
            <div className="shimmer skeleton-image" style={{ height: '120px' }}></div>
            <div className="shimmer skeleton-text" style={{ height: '240px' }}></div>
          </div>
          <div className="shimmer" style={{ flex: 1 }}></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header currentUser={{ name: user.name, role: 'Customer' }} onLogout={handleLogout} />

      {/* Main Dashboard Layout */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Left Search & Detail Panel */}
        <aside style={{
          width: '420px',
          backgroundColor: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          boxShadow: '4px 0 30px rgba(15,23,42,0.02)',
          flexShrink: 0,
        }}>
          {/* Welcome and Tagline Header */}
          <div style={{ padding: '2rem 2rem 1.25rem 2rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Sparkles size={12} /> Good Morning, {user.name.split(' ')[0]} 👋
              </span>
            </motion.div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.65rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--foreground)',
              lineHeight: 1.15
            }}>
              Discover Everything Around You
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 500 }}>
              Real-time local inventory & dispatches near you.
            </p>
          </div>

          {/* Search Inputs & Quick Filters */}
          <div style={{ padding: '1.25rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search foods, cakes, pharmacy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%',
                    padding: '0.75rem 2rem 0.75rem 2.25rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    backgroundColor: '#ffffff',
                    transition: 'var(--transition)'
                  }}
                  disabled={searching}
                />
                <button
                  onClick={handleVoiceInputSimulate}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Simulate Voice Search"
                >
                  <Mic size={14} />
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSearch()}
                style={{
                  padding: '0 1.25rem',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}
                disabled={searching}
              >
                {searching ? '...' : 'Search'}
              </motion.button>
            </div>

            {/* Quick Filter Pill Tags */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem', whiteSpace: 'nowrap' }} className="no-scrollbar">
              {searchExamples.map((item) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={item.label}
                  onClick={() => {
                    setSearchQuery(item.query);
                    handleSearch(false, item.query);
                  }}
                  disabled={searching}
                  style={{
                    backgroundColor: searchQuery === item.query ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                    border: `1px solid ${searchQuery === item.query ? 'var(--primary)' : 'rgba(226, 232, 240, 0.8)'}`,
                    color: searchQuery === item.query ? 'var(--primary)' : 'var(--text-muted)',
                    borderRadius: '20px',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>

            {/* Premium CTA Link to Sourcing Assistant */}
            <Link href="/customer/ai-assistant" style={{ textDecoration: 'none', marginTop: '4px' }}>
              <motion.div
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(52, 211, 153, 0.04) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '14px',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={12} className="text-primary" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>Query AI Sourcing Sensation</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                  Sourcing ➔
                </span>
              </motion.div>
            </Link>
          </div>

          {/* Location Status & Results list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
            {locationLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div className="shimmer skeleton-image" style={{ height: '90px', borderRadius: '16px' }}></div>
                <div className="shimmer skeleton-text"></div>
                <div className="shimmer skeleton-text"></div>
              </div>
            )}

            {locationError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                padding: '1.25rem',
                borderRadius: '16px',
                color: '#ef4444',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{locationError}</span>
              </div>
            )}

            {searchError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                padding: '1rem',
                borderRadius: '12px',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {searchError}
              </div>
            )}

            {!locationLoading && !locationError && (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    {searching ? 'Querying database...' : `SHOPS AROUND YOU (${businesses.length})`}
                  </span>
                  {coords && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={10} /> Active GPS
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {searching && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div className="shimmer skeleton-image" style={{ height: '80px', borderRadius: '16px' }}></div>
                      <div className="shimmer skeleton-image" style={{ height: '80px', borderRadius: '16px' }}></div>
                      <div className="shimmer skeleton-image" style={{ height: '80px', borderRadius: '16px' }}></div>
                    </div>
                  )}

                  {businesses.length === 0 && !searching && !searchError && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
                      <Compass size={32} style={{ margin: '0 auto 0.75rem auto', color: '#cbd5e1' }} />
                      <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>No active shops found nearby. Try searching another category tag.</p>
                    </div>
                  )}

                  {!searching && businesses.map((biz) => {
                    const isSelected = selectedBusiness?.id === biz.id;
                    return (
                      <motion.div
                        whileHover={{ y: -3, scale: 1.01, boxShadow: '0 12px 25px rgba(15,23,42,0.06)' }}
                        whileTap={{ scale: 0.99 }}
                        key={biz.id}
                        onClick={() => setSelectedBusiness(biz)}
                        style={{
                          padding: '1.25rem',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'rgba(226, 232, 240, 0.7)'}`,
                          borderRadius: '20px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                          boxShadow: '0 4px 15px rgba(15,23,42,0.02)',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                          <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--foreground)' }}>
                            {biz.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Navigation size={11} /> {(biz.distance / 1000).toFixed(1)} km
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                            {biz.category}
                          </p>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            backgroundColor: 'var(--primary)',
                            padding: '1px 6px',
                            borderRadius: '20px'
                          }}>
                            Partner
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ color: '#eab308', display: 'flex', alignItems: 'center' }}><Star size={12} fill="#eab308" /></span>
                          <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{biz.rating}</span>
                          <span style={{ color: 'var(--text-muted)' }}>({biz.reviewsCount} reviews)</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Right Map Canvas wrapped in premium container */}
        <section style={{
          flex: 1,
          position: 'relative',
          height: 'calc(100% - 2rem)',
          margin: '1rem',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          zIndex: 5
        }}>
          {coords ? (
            <Map
              userLat={coords.lat}
              userLon={coords.lon}
              businesses={businesses}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={(biz) => setSelectedBusiness(biz)}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontSize: '3rem', marginBottom: '1rem' }}
              >
                📍
              </motion.div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>Location Access Required</h3>
              <p style={{ maxWidth: '340px', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Please allow browser GPS permission to load the neighborhood map and locate merchant dispatches.
              </p>
            </div>
          )}

          {/* Floating Store Detail Card Overlay */}
          <AnimatePresence>
            {selectedBusiness && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '24px',
                  right: '24px',
                  maxWidth: '440px',
                  zIndex: 20
                }}
              >
                <div className="glass-card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 8px 32px rgba(15,23,42,0.08)'
                }}>
                  <div style={{ display: 'flex', gap: '1.25rem' }}>
                    {selectedBusiness.photoUrl && (
                      <img
                        src={selectedBusiness.photoUrl}
                        alt={selectedBusiness.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '16px',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: '1.15rem',
                            lineHeight: '1.3',
                            color: 'var(--foreground)',
                            margin: 0
                          }}>
                            {selectedBusinessDetails?.name || selectedBusiness.name}
                          </h3>
                          <button
                            onClick={() => setSelectedBusiness(null)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                              padding: 0
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.35rem 0 0.5rem 0' }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                            {selectedBusinessDetails?.category || selectedBusiness.category}
                          </p>
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            backgroundColor: (selectedBusinessDetails?.isRegistered || selectedBusiness.isRegistered) ? '#10b981' : 'var(--primary)',
                            padding: '1px 6px',
                            borderRadius: '20px'
                          }}>
                            {(selectedBusinessDetails?.isRegistered || selectedBusiness.isRegistered) ? '🏪 Merchant Partner' : 'Local Shop'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                          <span>👤 <strong>Owner Name:</strong> {selectedBusinessDetails?.ownerName || 'Merchant Partner'}</span>
                          <span>📍 <strong>Address:</strong> {selectedBusinessDetails?.address || selectedBusiness.address || 'Address not listed'}</span>
                          <span>🕒 <strong>Hours:</strong> {selectedBusinessDetails?.openingHours || (selectedBusiness as any).openingHours || 'Not Available'}</span>
                          <span>🛍️ <strong>Stock:</strong> {selectedBusinessProducts.length || (selectedBusiness as any).productsCount || 0} unique items online</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid rgba(226,232,240,0.6)', paddingTop: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <span style={{ color: '#eab308' }}><Star size={10} fill="#eab308" /></span>
                            <span style={{ fontWeight: 700 }}>{selectedBusinessDetails?.rating || selectedBusiness.rating}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({selectedBusinessDetails?.reviewsCount || selectedBusiness.reviewsCount})</span>
                          </div>
                          <span style={{
                            fontSize: '0.7rem',
                            color: (selectedBusinessDetails?.isOpen ?? selectedBusiness.isOpen) ? '#10b981' : '#ef4444',
                            fontWeight: 700,
                            marginTop: '2px'
                          }}>
                            {(selectedBusinessDetails?.isOpen ?? selectedBusiness.isOpen) ? '🟢 Open Now' : '🔴 Closed'}
                          </span>
                        </div>
                        
                        <Link
                          href={`/customer/shop/${selectedBusinessDetails?.sellerId || selectedBusiness.id}`}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '12px' }}
                        >
                          Explore Shop Menu
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Available Products and Live Inventory section */}
                  {selectedBusinessProducts.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(226,232,240,0.6)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        In-Stock Catalogs
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="no-scrollbar">
                        {selectedBusinessProducts.slice(0, 4).map((p) => {
                          const stock = parseInt(p.stock || p.available_stock || '0');
                          return (
                            <div key={p.id} style={{ flexShrink: 0, padding: '0.5rem', background: '#ffffff', border: '1px solid rgba(226,232,240,0.6)', borderRadius: '10px', fontSize: '0.75rem', minWidth: '100px' }}>
                              <span style={{ fontWeight: 700, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '90px' }}>{p.name}</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>₹{p.price}</span>
                              <span style={{ color: stock === 0 ? '#ef4444' : 'var(--text-muted)', display: 'block', fontSize: '0.65rem', marginTop: '1px' }}>
                                {stock === 0 ? 'Out of stock' : `${stock} units`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
