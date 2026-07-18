'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Business, BusinessSearchService } from '@/lib/businessSearch';

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
    'Restaurant',
    'Cafe',
    'Pharmacy',
    'Vegetables',
    'Electronics',
    'Books',
    'Groceries'
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

  // 2. Request browser Geolocation and print coords to console
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    console.log('[DEBUG] Requesting browser GPS location permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        console.log(`[DEBUG] Browser GPS coordinates obtained correctly: Latitude=${lat}, Longitude=${lon}`);
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

  // 3. Trigger initial search once location is loaded
  useEffect(() => {
    if (coords) {
      handleSearch(true);
    }
  }, [coords]);

  useEffect(() => {
    const currentBiz = selectedBusiness;
    if (!currentBiz) {
      setSelectedBusinessProducts([]);
      setSelectedBusinessDetails(null);
      return;
    }
    
    async function loadDetails() {
      if (!currentBiz) return;
      try {
        const res = await fetch(`/api/places/details?id=${currentBiz.id}`);
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
        console.error('Error loading selected business details:', err);
      }
    }
    loadDetails();
  }, [selectedBusiness]);

  const handleSearch = async (initial = false, customQuery?: string) => {
    if (!coords) {
      console.warn('[DEBUG] Search attempted but GPS coordinates are not ready yet.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setSelectedBusiness(null);
    const query = customQuery !== undefined ? customQuery : searchQuery;
    
    console.log(`[DEBUG] Executing search. Keyword: "${query}", Coordinates: Lat=${coords.lat}, Lon=${coords.lon}`);

    try {
      // First attempt: 5km (5000m)
      let radius = 5000;
      console.log(`[DEBUG] 1st search attempt. Radius: ${radius}m`);
      let results = await BusinessSearchService.search(coords.lat, coords.lon, query, radius);
      
      // Auto-retry with 10km (10000m) if 0 results
      if (results.length === 0) {
        radius = 10000;
        console.log(`[DEBUG] 0 businesses found within 5km. Auto-retrying with larger radius: ${radius}m (10km)...`);
        results = await BusinessSearchService.search(coords.lat, coords.lon, query, radius);
      }

      setBusinesses(results);
    } catch (err: any) {
      console.error('[DEBUG] Search API error:', err);
      setSearchError('Unable to load nearby businesses. Please try again.');
    } finally {
      setSearching(false);
    }
  };

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
        Loading customer dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Sticky Top Navigation */}
      <header className="header" style={{ flexShrink: 0, position: 'sticky', top: 0, width: '100%' }}>
        <div className="container header-container">
          <Link href="/" className="logo-group">
            <div className="logo-icon">N</div>
            <span>Nexthood</span>
          </Link>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link href="/customer/home" style={{
              fontWeight: pathname === '/customer/home' ? 600 : 500,
              color: pathname === '/customer/home' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}>
              Home
            </Link>
            <Link href="/customer/smart-search" style={{
              fontWeight: pathname === '/customer/smart-search' ? 600 : 500,
              color: pathname === '/customer/smart-search' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}>
              🔍 Smart Search
            </Link>
            <Link href="/customer/ai-assistant" style={{
              fontWeight: pathname === '/customer/ai-assistant' ? 600 : 500,
              color: pathname === '/customer/ai-assistant' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}>
              🤖 AI Assistant
            </Link>
            <Link href="/customer/flashfest" style={{
              fontWeight: pathname === '/customer/flashfest' ? 600 : 500,
              color: pathname === '/customer/flashfest' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}>
              FlashFest
            </Link>
            <Link href="/customer/checkout" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}>
              Cart
            </Link>
            <Link href="/customer/profile" style={{
              fontWeight: pathname === '/customer/profile' ? 600 : 500,
              color: pathname === '/customer/profile' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}>
              Profile
            </Link>
          </nav>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Hello, <strong>{user.name}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Left Search & Detail Panel */}
        <aside style={{
          width: '420px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          boxShadow: '4px 0 20px rgba(0,0,0,0.02)',
          flexShrink: 0,
        }}>
          {/* Welcome and Tagline Header */}
          <div style={{ padding: '2rem 2rem 1rem 2rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem'
            }}>
              Welcome back, {user.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Discover trusted businesses around you.
            </p>
          </div>

          {/* Search Inputs & Quick Filters */}
          <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="What are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ backgroundColor: '#ffffff', border: '1.5px solid var(--border)' }}
                disabled={searching}
              />
              <button
                onClick={() => handleSearch()}
                className="btn btn-primary"
                style={{ padding: '0 1.25rem' }}
                disabled={searching}
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {/* Quick Filter Pill Tags */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', whiteSpace: 'nowrap' }} className="no-scrollbar">
              {searchExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setSearchQuery(example);
                    handleSearch(false, example);
                  }}
                  disabled={searching}
                  style={{
                    backgroundColor: searchQuery === example ? 'rgba(16, 185, 129, 0.08)' : 'var(--secondary)',
                    border: `1px solid ${searchQuery === example ? 'var(--primary)' : 'var(--border)'}`,
                    color: searchQuery === example ? 'var(--primary)' : 'var(--foreground)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Location Status & Results list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
            {locationLoading && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                Detecting GPS coordinates...
              </div>
            )}

            {locationError && (
              <div className="message message-error" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                {locationError}
              </div>
            )}

            {searchError && (
              <div className="message message-error" style={{ fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '1.5rem' }}>
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
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    {searching ? 'Searching Places...' : `Nearby Businesses (${businesses.length})`}
                  </h3>
                  {coords && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                      GPS Connected
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {searching && (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      ⚡ Fetching real nearby businesses...
                    </div>
                  )}

                  {businesses.length === 0 && !searching && !searchError && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                      No shops found nearby. Try searching another keyword.
                    </div>
                  )}

                  {!searching && businesses.map((biz) => (
                    <div
                      key={biz.id}
                      onClick={() => setSelectedBusiness(biz)}
                      style={{
                        padding: '1.25rem',
                        border: `1.5px solid ${selectedBusiness?.id === biz.id ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        backgroundColor: selectedBusiness?.id === biz.id ? 'rgba(16, 185, 129, 0.02)' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.975rem', color: 'var(--foreground)' }}>
                          {biz.name}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, flexShrink: 0, marginLeft: '0.5rem' }}>
                          {(biz.distance / 1000).toFixed(1)} km
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
                          padding: '0.05rem 0.35rem',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          Real Data
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ color: '#eab308' }}>★</span>
                        <span style={{ fontWeight: 600 }}>{biz.rating}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({biz.reviewsCount} reviews)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Right Map Canvas with Floating Search Results */}
        <section style={{ flex: 1, position: 'relative', height: '100%' }}>
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
              <span style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📍</span>
              <p style={{ maxWidth: '400px', fontSize: '0.95rem' }}>
                Please allow browser location permissions to load the interactive neighborhood map.
              </p>
            </div>
          )}

          {/* Floating Store Detail Card Overlay */}
          {selectedBusiness && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              right: '24px',
              maxWidth: '440px',
              zIndex: 20,
              animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div className="card" style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1.5px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  {selectedBusiness.photoUrl && (
                    <img
                      src={selectedBusiness.photoUrl}
                      alt={selectedBusiness.name}
                      style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: 'var(--radius-md)',
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
                          fontWeight: 700,
                          fontSize: '1.15rem',
                          lineHeight: '1.3',
                          color: 'var(--foreground)',
                          marginBottom: '0.25rem'
                        }}>
                          🏪 {selectedBusinessDetails?.name || selectedBusiness.name}
                        </h3>
                        <button
                          onClick={() => setSelectedBusiness(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '1rem',
                            padding: '0 0 4px 4px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                          🏷 {selectedBusinessDetails?.category || selectedBusiness.category}
                        </p>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: (selectedBusinessDetails?.isRegistered || selectedBusiness.isRegistered) ? '#10b981' : 'var(--primary)',
                          padding: '0.05rem 0.35rem',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          {(selectedBusinessDetails?.isRegistered || selectedBusiness.isRegistered) ? '🏪 Registered Partner' : 'Demo Shop'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--foreground)', marginBottom: '0.75rem' }}>
                        <span>👤 <strong>Owner:</strong> {selectedBusinessDetails?.ownerName || 'Not Provided'}</span>
                        <span>📍 <strong>Address:</strong> {selectedBusinessDetails?.address || selectedBusiness.address || 'Not Available'}</span>
                        {selectedBusinessDetails?.phone && <span>📞 <strong>Phone:</strong> {selectedBusinessDetails.phone}</span>}
                        {selectedBusinessDetails?.email && <span>📧 <strong>Email:</strong> {selectedBusinessDetails.email}</span>}
                        <span>🕒 <strong>Hours:</strong> {selectedBusinessDetails?.openingHours || (selectedBusiness as any).openingHours || 'Not Available'}</span>
                        <span>🛒 <strong>Products:</strong> {selectedBusinessProducts.length || (selectedBusiness as any).productsCount || 0} Available</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                          <span style={{ color: '#eab308' }}>★</span>
                          <span style={{ fontWeight: 600 }}>{selectedBusinessDetails?.rating || selectedBusiness.rating || 'New Store'}</span>
                          <span style={{ color: 'var(--text-muted)' }}>({selectedBusinessDetails?.reviewsCount || selectedBusiness.reviewsCount || 0} reviews)</span>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          color: (selectedBusinessDetails?.isOpen ?? selectedBusiness.isOpen) ? '#10b981' : '#ef4444',
                          fontWeight: 600
                        }}>
                          {(selectedBusinessDetails?.isOpen ?? selectedBusiness.isOpen) ? '🟢 Open Now' : '🔴 Closed'}
                        </span>
                      </div>
                      
                      <Link
                        href={`/customer/shop/${selectedBusinessDetails?.sellerId || selectedBusiness.id}`}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                      >
                        View Shop
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Available Products and Live Inventory section */}
                {selectedBusinessProducts.length > 0 && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Live Products & Inventory ({selectedBusinessProducts.length})
                    </h5>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="no-scrollbar">
                      {selectedBusinessProducts.slice(0, 4).map((p) => {
                        const stock = parseInt(p.stock || p.available_stock || '0');
                        return (
                          <div key={p.id} style={{ flexShrink: 0, padding: '0.4rem 0.6rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', minWidth: '100px' }}>
                            <span style={{ fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }} title={p.name}>{p.name}</span>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{p.price}</span>
                            <span style={{ color: stock === 0 ? '#ef4444' : '#64748b', display: 'block', fontSize: '0.65rem', marginTop: '0.1rem' }}>
                              {stock === 0 ? 'Out of stock' : `${stock} left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
