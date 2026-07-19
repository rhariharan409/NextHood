'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import OptimizedImage from '@/components/OptimizedImage';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Users, Flame, Star, MapPin, ShoppingBag, ArrowRight } from 'lucide-react';

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
  price: number;
  discountPercent: number;
  image: string;
  shopId: string;
  shopName: string;
  rating: number;
  distance: number;
  deliveryTime: string;
  maxStock: number;
  viewers: number;
  purchasesToday: number;
  lastPurchaseSec: number;
}

export default function FlashFestPage() {
  const router = useRouter();
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
  
  // Custom toast messages
  const [toast, setToast] = useState<string | null>(null);
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
      id: '3928172902-p1',
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
      id: '3928172903-p1',
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
      id: '3928172904-p1',
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
      id: '3928172901-p1',
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
      const initStocks: Record<string, number> = {};
      for (const prod of flashProducts) {
        const res = await fetch(`/api/inventory?shopId=${prod.shopId}`);
        if (res.ok) {
          const data = await res.json();
          const item = data.inventory?.find((i: any) => i.product_id === prod.id);
          initStocks[prod.id] = item ? parseInt(item.stock_quantity) || 0 : 25;
        } else {
          initStocks[prod.id] = 25;
        }
      }
      setStocks(initStocks);
    } catch (e) {
      console.error('Failed to load real-time stock levels:', e);
    }
  };

  useEffect(() => {
    reloadStockLevels();
  }, []);

  // 4. WebSocket setup
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    setWs(socket);

    socket.onopen = () => {
      flashProducts.forEach((prod) => {
        socket.send(JSON.stringify({ type: 'subscribe', shopId: prod.shopId }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stock_update') {
          const { productId, stock, updateType, change } = data;
          setStocks((prev) => ({
            ...prev,
            [productId]: stock
          }));

          // Trigger pulse animation
          setPulseProducts((prev) => ({ ...prev, [productId]: true }));
          setTimeout(() => {
            setPulseProducts((prev) => ({ ...prev, [productId]: false }));
          }, 600);

          // update simulated buying rates
          if (updateType === 'reserve') {
            setPurchasesMap((prev) => ({ ...prev, [data.shopId]: (prev[data.shopId] || 10) + 1 }));
            setLastPurchaseSecMap((prev) => ({ ...prev, [data.shopId]: 0 }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  // 5. Simulated real-time viewing fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setViewersMap((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          const change = Math.floor(Math.random() * 9) - 4;
          updated[k] = Math.max(10, (updated[k] || 50) + change);
        });
        return updated;
      });

      setLastPurchaseSecMap((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          updated[k] = (updated[k] || 0) + 1;
        });
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 6. Buy Now / Reserve Inventory Checkout Wrapper
  const handleBuyNow = async (prod: FlashProduct) => {
    setReservingId(prod.id);
    setErrorToast(null);
    setToast(null);

    const currentStock = stocks[prod.id] !== undefined ? stocks[prod.id] : 10;
    if (currentStock <= 0) {
      setErrorToast('❌ Sold Out! Deal is no longer available.');
      setReservingId(null);
      return;
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: prod.shopId,
          productId: prod.id,
          action: 'reserve',
          quantity: 1
        })
      });

      if (response.ok) {
        // Broadcast stock update
        const nextStock = currentStock - 1;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'broadcast_update',
            shopId: prod.shopId,
            productId: prod.id,
            stock: nextStock,
            updateType: 'reserve',
            change: -1
          }));
        }

        setStocks((prev) => ({
          ...prev,
          [prod.id]: nextStock
        }));

        // Add to React context cart
        const cartItem = {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          description: `Flash deal item (Save ${prod.discountPercent}%)`,
          image: prod.image,
          category: prod.category
        };
        const shopDetails = {
          id: prod.shopId,
          name: prod.shopName,
          category: prod.category,
          lat: 0,
          lon: 0
        };

        addToCart(cartItem, shopDetails);
        setToast('⚡ Deal Claimed! Redirecting to checkout...');
        
        setTimeout(() => {
          router.push('/customer/checkout');
        }, 1200);
      } else {
        const errorData = await response.json();
        setErrorToast(`❌ ${errorData.message || 'Deal reservation blocked.'}`);
      }
    } catch (err) {
      console.error(err);
      setErrorToast('❌ Checkout failure. Network error.');
    } finally {
      setReservingId(null);
    }
  };

  const formatCountdownPart = (n: number) => String(n).padStart(2, '0');

  const filteredProducts = activeFilter === 'All'
    ? flashProducts
    : flashProducts.filter((p) => p.category === activeFilter);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <Header />
        <div className="container" style={{ maxWidth: '1100px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="shimmer skeleton-title" style={{ height: '40px', width: '50%' }}></div>
          <div className="shimmer skeleton-image" style={{ height: '180px' }}></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Customer' }} onLogout={handleLogout} />

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 1.5rem', fontFamily: 'var(--font-family)' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Header section with countdown */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Zap size={12} fill="#ef4444" /> Live Neighborhood Event
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                FlashFest Deals
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>High-demand products with massive discount claims.</p>
            </div>

            {/* Countdown timer */}
            <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px solid #fca5a5', backgroundColor: 'rgba(254,226,226,0.2)' }}>
              <Clock size={16} color="#ef4444" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>ENDS IN:</span>
              <strong style={{ fontSize: '1.15rem', color: '#ef4444', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {formatCountdownPart(countdown.hours)}:{formatCountdownPart(countdown.minutes)}:{formatCountdownPart(countdown.seconds)}
              </strong>
            </div>
          </div>

          {/* Featured Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #065f46 0%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '3.5rem 3rem',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(6, 95, 70, 0.12)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            }}></div>

            <div style={{ maxWidth: '600px', position: 'relative', zIndex: 2 }}>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                display: 'inline-block',
                marginBottom: '1rem',
                border: '1px solid rgba(16,185,129,0.3)'
              }}>
                ⚡ FLASH SALE
              </span>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '3rem',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                marginBottom: '0.75rem'
              }}>
                Up to 70% OFF
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#a7f3d0', marginBottom: '2rem', fontWeight: 500 }}>
                High-demand products with limited neighborhood stock slots. Shop now before inventory sells out!
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const targetEl = document.getElementById('deals-section');
                  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-primary"
                style={{ padding: '0.85rem 2.25rem', backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '0.9rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Shop Now <ArrowRight size={14} />
              </motion.button>
            </div>
          </div>

          {/* Filters and List header */}
          <div id="deals-section" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            paddingBottom: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--foreground)' }}>
              Live Claims Grid
            </h2>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['All', 'Bakery', 'Restaurant', 'Pharmacy', 'Grocery'] as const).map((cat) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  style={{
                    backgroundColor: activeFilter === cat ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                    border: `1.5px solid ${activeFilter === cat ? 'var(--primary)' : 'rgba(226, 232, 240, 0.6)'}`,
                    color: activeFilter === cat ? 'var(--primary)' : 'var(--text-muted)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {cat}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Live Sale Products Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem'
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
              let badgeColor = '#ef4444';
              let badgeText = `Only ${stock} Left`;

              if (stock <= 5 && stock > 0) {
                badgeText = `⚠ Hurry! Only ${stock} Left`;
              } else if (stock <= 10) {
                badgeColor = '#ea580c';
              } else if (stock > 0) {
                badgeColor = '#10b981';
              }

              return (
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  key={prod.id}
                  style={{
                    backgroundColor: '#ffffff',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1.5px solid ${isPulse ? 'var(--primary)' : 'rgba(226, 232, 240, 0.7)'}`,
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                >
                  {/* Discount ribbon */}
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    zIndex: 5
                  }}>
                    {prod.discountPercent}% OFF
                  </span>

                  <OptimizedImage
                    src={prod.image}
                    alt={prod.name}
                    category={prod.category}
                    style={{
                      height: '200px',
                      borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
                      borderRadius: '0'
                    }}
                  />

                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                          {prod.name}
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          ★ {prod.rating}
                        </span>
                      </div>
                      
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Shop: <strong style={{ color: 'var(--foreground)' }}>{prod.shopName}</strong>
                      </span>

                      {/* Distance / delivery details */}
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={11} /> {(prod.distance / 1000).toFixed(1)} km away</span>
                        <span>•</span>
                        <span>⏱ {prod.deliveryTime}</span>
                      </div>
                    </div>

                    {/* Pricing Block */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>₹{prod.price}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{prod.originalPrice}</span>
                    </div>

                    {/* Progress Bar sold */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        <span>Claimed: <strong>{soldUnits} / {prod.maxStock}</strong></span>
                        <span>{progressPercent}% Sold</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          backgroundColor: '#ef4444',
                          borderRadius: '20px',
                          transition: 'width 0.4s ease'
                        }}></div>
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: badgeColor,
                        display: 'inline-block'
                      }}></span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: badgeColor,
                        transition: 'transform 0.3s ease',
                        transform: isPulse ? 'scale(1.15)' : 'scale(1)'
                      }}>
                        {stock > 0 ? badgeText : 'Deal Sold Out'}
                      </span>
                    </div>

                    {/* Live Activities */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(226, 232, 240, 0.6)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={12} /> <strong>{viewers}</strong> local buyers viewing
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Flame size={12} color="#ea580c" /> <strong>{purchases}</strong> claimed in last 3h
                      </span>
                      <span style={{ fontSize: '0.7rem', color: lastPurchaseSec <= 15 ? 'var(--primary)' : 'var(--text-muted)', fontStyle: 'italic' }}>
                        ⚡ Last checkout {lastPurchaseSec === 0 ? 'just now' : `${lastPurchaseSec}s ago`}
                      </span>
                    </div>

                    {/* Buy Now Trigger */}
                    {stock > 0 ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBuyNow(prod)}
                        disabled={reservingId !== null}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.65rem 0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(16,185,129,0.15)' }}
                      >
                        <ShoppingBag size={14} /> {reservingId === prod.id ? 'Claiming Deal...' : 'Claim Deal Now'}
                      </motion.button>
                    ) : (
                      <button
                        disabled
                        className="btn btn-secondary"
                        style={{ width: '100%', padding: '0.65rem 0', cursor: 'not-allowed', color: '#94a3b8', backgroundColor: '#f1f5f9', borderColor: 'rgba(226,232,240,0.8)', borderRadius: '12px' }}
                      >
                        Sold Out
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </main>

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #10b981',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)',
              zIndex: 10000
            }}
          >
            {toast}
          </motion.div>
        )}
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)',
              zIndex: 10000
            }}
          >
            {errorToast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
