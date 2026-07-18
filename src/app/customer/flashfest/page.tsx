'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import OptimizedImage from '@/components/OptimizedImage';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface FlashProduct {
  id: string;
  name: string;
  category: string;
  originalPrice: number;
  price: number; // Discounted Price
  discountPercent: number;
  image: string;
  shopId: string;
  shopName: string;
  rating: number;
  distance: number; // in meters
  deliveryTime: string;
  maxStock: number;
  // Simulated stats
  viewers: number;
  purchasesToday: number;
  lastPurchaseSec: number;
}

export default function FlashFestPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { addToCart } = useCart();

  // Authentication & GPS
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Countdown timer
  const [countdown, setCountdown] = useState({ hours: 3, minutes: 45, seconds: 18 });

  // Filter
  const [activeFilter, setActiveFilter] = useState<'All' | 'Bakery' | 'Restaurant' | 'Pharmacy' | 'Grocery'>('All');

  // Products and Stocks
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Simulated activity updates
  const [pulseProducts, setPulseProducts] = useState<Record<string, boolean>>({});
  const [viewersMap, setViewersMap] = useState<Record<string, number>>({
    '3928172901': 126,
    '3928172902': 89,
    '3928172903': 142,
    '3928172904': 95
  });
  const [purchasesMap, setPurchasesMap] = useState<Record<string, number>>({
    '3928172901': 42,
    '3928172902': 28,
    '3928172903': 38,
    '3928172904': 46
  });
  const [lastPurchaseSecMap, setLastPurchaseSecMap] = useState<Record<string, number>>({
    '3928172901': 30,
    '3928172902': 45,
    '3928172903': 15,
    '3928172904': 10
  });

  const flashProducts: FlashProduct[] = [
    {
      id: '3928172902-p1', // Fudge Cake
      name: 'Premium Chocolate Fudge Cake',
      category: 'Bakery',
      originalPrice: 450,
      price: 135,
      discountPercent: 70,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60',
      shopId: '3928172902',
      shopName: 'Nexthood Central Bakery',
      rating: 4.8,
      distance: 1200,
      deliveryTime: '10-15 mins',
      maxStock: 50,
      viewers: 126,
      purchasesToday: 42,
      lastPurchaseSec: 30
    },
    {
      id: '3928172903-p1', // Special Burger
      name: 'Nexthood Special Burger',
      category: 'Restaurant',
      originalPrice: 180,
      price: 90,
      discountPercent: 50,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
      shopId: '3928172903',
      shopName: 'Nexthood Gourmet Bistro',
      rating: 4.6,
      distance: 2400,
      deliveryTime: '20-30 mins',
      maxStock: 50,
      viewers: 89,
      purchasesToday: 28,
      lastPurchaseSec: 45
    },
    {
      id: '3928172904-p1', // Paracetamol
      name: 'Paracetamol 650mg (15 Tabs)',
      category: 'Pharmacy',
      originalPrice: 180,
      price: 108,
      discountPercent: 40,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=60',
      shopId: '3928172904',
      shopName: 'Nexthood Wellness Pharmacy',
      rating: 4.5,
      distance: 3100,
      deliveryTime: '20-30 mins',
      maxStock: 50,
      viewers: 142,
      purchasesToday: 38,
      lastPurchaseSec: 15
    },
    {
      id: '3928172901-p1', // Organic Apples
      name: 'Fresh Organic Apples (1kg)',
      category: 'Grocery',
      originalPrice: 160,
      price: 64,
      discountPercent: 60,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60',
      shopId: '3928172901',
      shopName: 'Nexthood Corner Store',
      rating: 4.4,
      distance: 550,
      deliveryTime: '10-15 mins',
      maxStock: 50,
      viewers: 95,
      purchasesToday: 46,
      lastPurchaseSec: 10
    }
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

  // 2. Countdown clock ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Fetch/Initialize DB Inventory Stock Levels
  const reloadStockLevels = async () => {
    try {
      const newStocks: Record<string, number> = {};
      
      for (const prod of flashProducts) {
        const res = await fetch(`/api/inventory?shopId=${prod.shopId}`);
        const data = await res.json();
        const invItem = data.inventory?.find((item: any) => item.product_id === prod.id);

        if (invItem) {
          newStocks[prod.id] = parseInt(invItem.stock_quantity) || 0;
        } else {
          // Initialize with low flash sale stock (8 to 15)
          const initVal = 6 + Math.floor(Math.random() * 10);
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopId: prod.shopId,
              productId: prod.id,
              action: 'restock',
              quantity: initVal
            })
          });
          newStocks[prod.id] = initVal;
        }
      }
      setStocks(newStocks);
    } catch (e) {
      console.error('Error fetching inventory levels:', e);
    }
  };

  useEffect(() => {
    if (user) {
      reloadStockLevels();
    }
  }, [user]);

  // 4. WebSocket Sync
  useEffect(() => {
    if (!user) return;
    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log('[DEBUG] Connected to WS on port 3001 from FlashFest');
      // Subscribe to all flash shops
      flashProducts.forEach((p) => {
        socket.send(JSON.stringify({ type: 'subscribe', shopId: p.shopId }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stock_update') {
          const { productId, stock, change } = msg;
          setStocks((prev) => ({ ...prev, [productId]: stock }));
          
          setPulseProducts((prev) => ({ ...prev, [productId]: true }));
          setTimeout(() => {
            setPulseProducts((prev) => ({ ...prev, [productId]: false }));
          }, 600);

          if (change < 0) {
            setNotification('A customer completed a purchase!');
            setTimeout(() => setNotification(null), 2500);

            // Increment local purchases today metric
            setPurchasesMap(prev => ({
              ...prev,
              [productId.split('-')[0]]: (prev[productId.split('-')[0]] || 40) + Math.abs(change)
            }));
            // Reset last purchase time to 0 seconds ago
            setLastPurchaseSecMap(prev => ({
              ...prev,
              [productId.split('-')[0]]: 0
            }));
          }
        }
      } catch (e) {
        console.error('WS parsing error:', e);
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user]);

  // 5. Simulated real-time stats updates (ticks down timer and changes viewer count slightly)
  useEffect(() => {
    const timer = setInterval(() => {
      // Tick viewer counts
      setViewersMap(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] = Math.max(50, next[k] + (Math.random() < 0.5 ? -3 : 4));
        });
        return next;
      });

      // Increment seconds since last purchase
      setLastPurchaseSecMap(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] = next[k] + 1;
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // 6. Buy Now / Atomic Reservation Queue Handler
  const handleBuyNow = async (prod: FlashProduct) => {
    setReservingId(prod.id);
    setErrorToast(null);

    try {
      // 1. Lock and Reserve 1 unit via atomic reservation API
      const response = await fetch('/api/inventory/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: prod.shopId,
          productId: prod.id,
          quantity: 1
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Broadcast reserve update via WS to other connected users
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'broadcast_update',
            shopId: prod.shopId,
            productId: prod.id,
            stock: data.stock,
            updateType: 'reserve',
            change: -1
          }));
        }

        // Add to active shopping cart
        addToCart({
          id: prod.id,
          name: prod.name,
          price: prod.price,
          description: `FlashFest limited-time deal. Original Price: ₹${prod.originalPrice}`,
          image: prod.image,
          category: prod.category
        }, {
          id: prod.shopId,
          name: prod.shopName,
          category: prod.category,
          lat: 0,
          lon: 0
        });

        // Navigate directly to checkout
        router.push('/customer/checkout');
      } else {
        // Sold out
        setErrorToast('Sorry, another customer completed the purchase before you.');
        setTimeout(() => setErrorToast(null), 5000);
      }
    } catch (e) {
      console.error('Reservation failed:', e);
      setErrorToast('Network error during reservation. Please try again.');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setReservingId(null);
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
        Loading FlashFest dashboard...
      </div>
    );
  }

  // Filter products
  const filteredProducts = activeFilter === 'All' 
    ? flashProducts 
    : flashProducts.filter(p => p.category === activeFilter);

  const formatCountdownPart = (val: number) => String(val).padStart(2, '0');

  return (
    <>
      <Header />

      {/* Sticky Top Navigation */}
      <header className="header" style={{ flexShrink: 0, position: 'sticky', top: 0, width: '100%', zIndex: 100 }}>
        <div className="container header-container">
          <Link href="/" className="logo-group">
            <div className="logo-icon">N</div>
            <span>Nexthood</span>
          </Link>

          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link href="/customer/home" style={{
              fontWeight: pathname === '/customer/home' ? 600 : 500,
              color: pathname === '/customer/home' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Home
            </Link>
            <Link href="/customer/smart-search" style={{
              fontWeight: pathname === '/customer/smart-search' ? 600 : 500,
              color: pathname === '/customer/smart-search' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
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
              textDecoration: 'none'
            }}>
              FlashFest
            </Link>
            <Link href="/customer/checkout" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Cart
            </Link>
            <Link href="/customer/profile" style={{
              fontWeight: pathname === '/customer/profile' ? 600 : 500,
              color: pathname === '/customer/profile' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Profile
            </Link>
          </nav>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Hello, <strong>{user?.name}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Reserving Overlay Queue Indicator */}
      {reservingId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-family)',
        }}>
          <div className="card" style={{ padding: '2rem 3rem', backgroundColor: '#ffffff', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', animation: 'hurry-pulse 1s infinite', marginBottom: '1rem' }}>🔒</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>Reserving your item...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Holding your spot in the high-concurrency order queue.
            </p>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '90px',
          right: '24px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
          zIndex: 1000,
          fontWeight: 600,
          fontSize: '0.9rem',
          animation: 'slide-in 0.2s ease-out'
        }}>
          {notification}
        </div>
      )}

      {/* Floating Error Toast */}
      {errorToast && (
        <div style={{
          position: 'fixed',
          top: '90px',
          right: '24px',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
          zIndex: 1000,
          fontWeight: 600,
          fontSize: '0.9rem',
          animation: 'slide-in 0.2s ease-out'
        }}>
          {errorToast}
        </div>
      )}

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          
          {/* Header & Countdown */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--foreground)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ⚡ FlashFest
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.25rem' }}>
                Limited-time deals from your neighborhood stores.
              </p>
            </div>

            {/* Countdown card */}
            <div className="card" style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #ef4444',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 6px -1px rgba(239,68,68,0.05)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#ef4444' }}>
                Sale Ends In
              </span>
              <strong style={{
                fontFamily: 'monospace',
                fontSize: '1.4rem',
                color: 'var(--foreground)',
                letterSpacing: '0.05em'
              }}>
                {formatCountdownPart(countdown.hours)}:{formatCountdownPart(countdown.minutes)}:{formatCountdownPart(countdown.seconds)}
              </strong>
            </div>
          </div>

          {/* Featured Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #065f46 0%, #0f172a 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '4rem 3rem',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '3rem',
            boxShadow: '0 20px 25px -5px rgba(6,95,70,0.15)',
            animation: 'fadeIn 0.8s ease-out'
          }}>
            {/* Background elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
            }}></div>

            <div style={{ maxWidth: '600px', position: 'relative', zIndex: 2 }}>
              <span style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-block',
                marginBottom: '1.5rem'
              }}>
                ⚡ FLASH FEST DEALS
              </span>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '3.5rem',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                marginBottom: '1rem'
              }}>
                Up to 70% OFF
              </h2>
              <p style={{ fontSize: '1.15rem', color: '#a7f3d0', marginBottom: '2.5rem', fontWeight: 500 }}>
                High-demand products with limited neighborhood slots. Shop now before inventory runs out!
              </p>
              <button
                onClick={() => {
                  const targetEl = document.getElementById('deals-section');
                  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-primary"
                style={{ padding: '0.85rem 2.25rem', backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '0.95rem' }}
              >
                Shop Now
              </button>
            </div>
          </div>

          {/* Filters and List header */}
          <div id="deals-section" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1.25rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
              Live Deals
            </h2>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['All', 'Bakery', 'Restaurant', 'Pharmacy', 'Grocery'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  style={{
                    backgroundColor: activeFilter === cat ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                    border: `1.5px solid ${activeFilter === cat ? 'var(--primary)' : 'var(--border)'}`,
                    color: activeFilter === cat ? 'var(--primary)' : 'var(--foreground)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Live Sale Products Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem'
          }}>
            {filteredProducts.map((prod) => {
              const stock = stocks[prod.id] !== undefined ? stocks[prod.id] : 10;
              const isPulse = pulseProducts[prod.id] || false;
              
              // Dynamic stats calculations
              const viewers = viewersMap[prod.shopId] || prod.viewers;
              const purchases = purchasesMap[prod.shopId] || prod.purchasesToday;
              const lastPurchaseSec = lastPurchaseSecMap[prod.shopId] !== undefined ? lastPurchaseSecMap[prod.shopId] : prod.lastPurchaseSec;

              // Progress bar
              const soldUnits = Math.max(0, prod.maxStock - stock);
              const progressPercent = Math.min(100, Math.round((soldUnits / prod.maxStock) * 100));

              // Stock Status badges
              let badgeColor = '#ef4444'; // Red
              let badgeBg = '#fee2e2';
              let badgeBorder = '#fca5a5';
              let badgeText = `Only ${stock} Left`;

              if (stock <= 5 && stock > 0) {
                badgeText = `⚠ Hurry! Only ${stock} Left`;
              } else if (stock <= 10) {
                badgeColor = '#ea580c'; // Orange
                badgeBg = '#ffedd5';
                badgeBorder = '#fed7aa';
              } else if (stock > 0) {
                badgeColor = '#10b981'; // Green
                badgeBg = '#d1fae5';
                badgeBorder = '#a7f3d0';
              }

              return (
                <div key={prod.id} className="card" style={{
                  backgroundColor: '#ffffff',
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid var(--border)',
                  position: 'relative'
                }}>
                  {/* Discount ribbon */}
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    zIndex: 5
                  }}>
                    {prod.discountPercent}% OFF
                  </span>

                  <OptimizedImage
                    src={prod.image}
                    alt={prod.name}
                    category={prod.category}
                    style={{
                      height: '220px',
                      borderBottom: '1px solid var(--border)',
                      borderRadius: '0'
                    }}
                  />

                  <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                          {prod.name}
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          ⭐ {prod.rating}
                        </span>
                      </div>
                      
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Shop: <strong style={{ color: 'var(--foreground)' }}>{prod.shopName}</strong>
                      </span>

                      {/* Distance / delivery details */}
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <span>📍 {(prod.distance / 1000).toFixed(1)} km</span>
                        <span>•</span>
                        <span>⏱ {prod.deliveryTime}</span>
                      </div>
                    </div>

                    {/* Pricing Block */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>₹{prod.price}</strong>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{prod.originalPrice}</span>
                    </div>

                    {/* Progress Bar sold */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        <span>Sold: <strong>{soldUnits} / {prod.maxStock}</strong></span>
                        <span>{progressPercent}% Claimed</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          backgroundColor: '#ef4444',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }}></div>
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: badgeColor,
                        display: 'inline-block'
                      }}></span>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: badgeColor,
                        transition: 'transform 0.3s ease',
                        transform: isPulse ? 'scale(1.2)' : 'scale(1)'
                      }}>
                        {stock > 0 ? badgeText : 'Sold Out'}
                      </span>
                    </div>

                    {/* Live Activities */}
                    <div style={{
                      backgroundColor: 'var(--secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ display: 'flex', justifyItems: 'center', gap: '0.35rem' }}>
                        <span>👀</span> <strong>{viewers}</strong> people viewing this deal
                      </div>
                      <div style={{ display: 'flex', justifyItems: 'center', gap: '0.35rem' }}>
                        <span>🔥</span> <strong>{purchases}</strong> purchased today
                      </div>
                      <div style={{ display: 'flex', justifyItems: 'center', gap: '0.35rem', color: lastPurchaseSec <= 15 ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <span>⚡</span> Someone bought this {lastPurchaseSec === 0 ? 'just now' : `${lastPurchaseSec} seconds ago`}
                      </div>
                    </div>

                    {/* Buy Now Trigger */}
                    {stock > 0 ? (
                      <button
                        onClick={() => handleBuyNow(prod)}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        Buy Now
                      </button>
                    ) : (
                      <button
                        disabled
                        className="btn btn-secondary"
                        style={{ width: '100%', padding: '0.75rem 0', cursor: 'not-allowed', color: '#94a3b8', backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' }}
                      >
                        Sold Out
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes hurry-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
