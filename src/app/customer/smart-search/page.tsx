'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import OptimizedImage from '@/components/OptimizedImage';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Filter, Store, Star, MapPin, Clock, ArrowUpDown, ShoppingBag } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface ProductComparison {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  shopId: string;
  shopName: string;
  shopRating: number;
  distance: number; // in meters
  deliveryTime: string;
  stock: number;
  aiBadge: string;
}

function getShopProducts(category: string, shopId: string) {
  const cat = category.toLowerCase();
  
  if (cat.includes('bakery') || cat.includes('cake') || cat.includes('confectionery')) {
    return [
      { id: `${shopId}-p1`, name: 'Premium Chocolate Fudge Cake', price: 450, description: 'Decadent chocolate cake layers.', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60', category: 'Cakes' },
      { id: `${shopId}-p2`, name: 'Fresh Blueberry Muffin', price: 90, description: 'Soft Muffin with blueberries.', image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=60', category: 'Pastries' },
      { id: `${shopId}-p3`, name: 'Artisanal Sourdough Bread', price: 120, description: 'Rustic sourdough bread.', image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=60', category: 'Bread' },
      { id: `${shopId}-p4`, name: 'Buttery French Croissant', price: 80, description: 'Flaky pastry with real butter.', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=60', category: 'Pastries' }
    ];
  }

  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) {
    return [
      { id: `${shopId}-p1`, name: 'Nexthood Special Burger', price: 180, description: 'Juicy burger with special sauce.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60', category: 'Mains' },
      { id: `${shopId}-p2`, name: 'Margherita Pizza (10")', price: 260, description: 'Classic mozzarella pizza.', image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=60', category: 'Mains' },
      { id: `${shopId}-p3`, name: 'Premium Espresso Macchiato', price: 110, description: 'Velvety espresso shot.', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&auto=format&fit=crop&q=60', category: 'Beverages' },
      { id: `${shopId}-p4`, name: 'Healthy Caesar Salad', price: 150, description: 'Crispy romaine and croutons.', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&auto=format&fit=crop&q=60', category: 'Sides' }
    ];
  }

  if (cat.includes('pharmacy') || cat.includes('medicine') || cat.includes('chemist')) {
    return [
      { id: `${shopId}-p1`, name: 'Paracetamol 650mg (15 Tablets)', price: 30, description: 'Fast relief from pain and fever.', image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=60', category: 'OTC Medicines' },
      { id: `${shopId}-p2`, name: 'Premium Vitamin C + Zinc Chewables', price: 180, description: 'Immunity booster chewables.', image: 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?w=400&auto=format&fit=crop&q=60', category: 'Vitamins & Supplements' },
      { id: `${shopId}-p3`, name: 'Waterproof Band-Aid Strips (20 Pack)', price: 60, description: 'Flexible sterile bandages.', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=60', category: 'First Aid' }
    ];
  }

  return [
    { id: `${shopId}-p1`, name: 'Fresh Organic Apples (1kg)', price: 160, description: 'Crisp organic apples.', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60', category: 'Fruits & Vegetables' },
    { id: `${shopId}-p2`, name: 'Fresh Local Farm Tomatoes (1kg)', price: 60, description: 'Ripe and juicy farm tomatoes.', image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60', category: 'Fruits & Vegetables' },
    { id: `${shopId}-p3`, name: 'Full Cream Milk (1L)', price: 74, description: 'Pasteurized premium fresh milk.', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60', category: 'Dairy & Eggs' },
    { id: `${shopId}-p4`, name: 'Farm Fresh Brown Eggs (Pack of 12)', price: 90, description: 'Naturally raised brown eggs.', image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=60', category: 'Dairy & Eggs' }
  ];
}

export default function SmartSearchPage() {
  const router = useRouter();
  const { addToCart, cartCount } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // GPS Coordinates
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonResults, setComparisonResults] = useState<ProductComparison[]>([]);
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'ai' | 'price_asc' | 'rating_desc' | 'distance_asc' | 'delivery_asc' | 'discount_desc'>('ai');

  const exampleSearches = ['Milk', 'Rice', 'Apple', 'Cake', 'Bread', 'Vegetables', 'Medicine'];

  // 1. Authenticate customer and obtain GPS coordinates
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
          return;
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
              setLocationLoading(false);
            },
            () => {
              // Fallback default coordinates
              setCoords({ lat: 12.9716, lon: 77.5946 });
              setLocationLoading(false);
            }
          );
        } else {
          setCoords({ lat: 12.9716, lon: 77.5946 });
          setLocationLoading(false);
        }
      } catch (err) {
        router.push('/customer/auth');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSearch = async (query = searchQuery) => {
    if (!coords || !query.trim()) return;
    setSearching(true);

    try {
      // 1. Query Places API to find nearby businesses
      const resPlaces = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords.lat, lon: coords.lon, keyword: '', radius: 10000 })
      });
      const dataPlaces = await resPlaces.json();
      const shops = dataPlaces.businesses || [];

      const list: ProductComparison[] = [];

      // 2. Loop through shops and fetch their actual stock/prices
      for (const shop of shops) {
        const resInv = await fetch(`/api/inventory?shopId=${shop.id}`);
        const dataInv = await resInv.json();
        const serverInventory = dataInv.inventory || [];

        // Generate full product list for shop based on category
        const productsList = getShopProducts(shop.category || 'grocery', shop.id);

        // Filter products matching search term
        const keyword = query.toLowerCase().trim();
        const matchedProducts = productsList.filter(
          (p) =>
            p.name.toLowerCase().includes(keyword) ||
            p.category.toLowerCase().includes(keyword) ||
            p.description.toLowerCase().includes(keyword)
        );

        for (const prod of matchedProducts) {
          const invItem = serverInventory.find((item: any) => item.product_id === prod.id);
          const stock = invItem ? parseInt(invItem.stock_quantity) || 0 : 25;

          // Delivery times based on distance
          const distKm = parseFloat((shop.distance / 1000).toFixed(1));
          let deliveryTime = '10-15 mins';
          if (distKm > 5) deliveryTime = '35-45 mins';
          else if (distKm > 2) deliveryTime = '20-30 mins';

          list.push({
            id: prod.id,
            name: prod.name,
            price: prod.price,
            description: prod.description,
            image: prod.image,
            category: prod.category,
            shopId: shop.id,
            shopName: shop.name,
            shopRating: shop.rating || 4.2,
            distance: shop.distance,
            deliveryTime,
            stock,
            aiBadge: ''
          });
        }
      }

      // 3. Simple Mock LLM scoring logic for recommendation engine (AI Badge assignment)
      if (list.length > 0) {
        // Find best price
        let minPrice = Math.min(...list.map((l) => l.price));
        // Find closest
        let minDistance = Math.min(...list.map((l) => l.distance));
        // Find best rating
        let maxRating = Math.max(...list.map((l) => l.shopRating));

        list.forEach((item) => {
          if (item.price === minPrice && item.distance === minDistance) {
            item.aiBadge = '🌟 Best Match (Cheapest & Nearest)';
          } else if (item.price === minPrice) {
            item.aiBadge = '💰 Cheapest Option';
          } else if (item.distance === minDistance) {
            item.aiBadge = '⚡ Nearest Delivery';
          } else if (item.shopRating === maxRating) {
            item.aiBadge = '⭐ Top Rated Shop';
          }
        });
      }

      setComparisonResults(list);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Add Item wrapper
  const handleAddItem = (item: ProductComparison) => {
    // resolve schema compatibility
    const prod: any = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      category: item.category
    };
    const shop = {
      id: item.shopId,
      name: item.shopName,
      category: item.category,
      lat: 0,
      lon: 0
    };
    addToCart(prod, shop);
  };

  // Sorted list resolver
  const sortedList = useMemo(() => {
    const listCopy = [...comparisonResults];
    switch (sortBy) {
      case 'price_asc':
        return listCopy.sort((a, b) => a.price - b.price);
      case 'rating_desc':
        return listCopy.sort((a, b) => b.shopRating - a.shopRating);
      case 'distance_asc':
        return listCopy.sort((a, b) => a.distance - b.distance);
      case 'delivery_asc':
        return listCopy.sort((a, b) => {
          const aMins = parseInt(a.deliveryTime) || 15;
          const bMins = parseInt(b.deliveryTime) || 15;
          return aMins - bMins;
        });
      case 'ai':
      default:
        // Prioritize items with AI Badges first
        return listCopy.sort((a, b) => {
          if (a.aiBadge && !b.aiBadge) return -1;
          if (!a.aiBadge && b.aiBadge) return 1;
          return a.price - b.price; // secondary sort cheapest
        });
    }
  }, [comparisonResults, sortBy]);

  const hasResults = comparisonResults.length > 0;

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <Header />
        <div className="container" style={{ maxWidth: '1100px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="shimmer skeleton-title" style={{ height: '40px', width: '55%' }}></div>
          <div className="shimmer skeleton-image" style={{ height: '100px' }}></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Customer' }} onLogout={handleLogout} />

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2.5rem', fontFamily: 'var(--font-family)' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Header section */}
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--primary)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.75rem'
            }}>
              <Sparkles size={12} /> Real-Time Comparison Engine
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--foreground)',
              margin: '0 0 0.5rem 0'
            }}>
              Smart Comparison Search
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '550px', margin: '0 auto' }}>
              Find which local merchant has your products in stock at the best rates and closest delivery dispatches.
            </p>
          </div>

          {/* Search Inputs Card */}
          <div className="glass-card" style={{ padding: '1.75rem 2rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type 'Milk', 'Bread', 'Apple', 'Cake'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, minWidth: '280px', border: '1px solid rgba(226, 232, 240, 0.8)', backgroundColor: '#ffffff', borderRadius: '12px' }}
                disabled={searching}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSearch()}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2.5rem', borderRadius: '12px' }}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? 'Querying...' : 'Compare Products'}
              </motion.button>
            </div>

            {/* Quick Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginTop: '1.25rem', paddingBottom: '0.25rem' }} className="no-scrollbar">
              {exampleSearches.map((pill) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={pill}
                  onClick={() => {
                    setSearchQuery(pill);
                    handleSearch(pill);
                  }}
                  disabled={searching}
                  style={{
                    backgroundColor: searchQuery === pill ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                    border: `1px solid ${searchQuery === pill ? 'var(--primary)' : 'rgba(226, 232, 240, 0.6)'}`,
                    color: searchQuery === pill ? 'var(--primary)' : 'var(--text-muted)',
                    borderRadius: '20px',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {pill}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Search Result display */}
          {searching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="shimmer skeleton-image" style={{ height: '110px', borderRadius: '16px' }}></div>
              <div className="shimmer skeleton-image" style={{ height: '110px', borderRadius: '16px' }}></div>
              <div className="shimmer skeleton-image" style={{ height: '110px', borderRadius: '16px' }}></div>
            </div>
          ) : hasResults ? (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              
              {/* Left Column: Comparisons & Results */}
              <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Sorting Options */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Found {comparisonResults.length} options matching "{searchQuery}"
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ArrowUpDown size={12} /> Sort:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        color: 'var(--foreground)'
                      }}
                    >
                      <option value="ai">🌟 AI Recommended</option>
                      <option value="price_asc">💵 Cheapest Price</option>
                      <option value="rating_desc">⭐ Highest Rating</option>
                      <option value="distance_asc">📍 Nearest Distance</option>
                      <option value="delivery_asc">⚡ Fastest Delivery</option>
                    </select>
                  </div>
                </div>

                {/* Main Results Listing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <AnimatePresence>
                    {sortedList.map((item) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        key={item.id}
                        className="glass-card"
                        style={{
                          padding: '1.25rem',
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 160px',
                          gap: '1.5rem',
                          alignItems: 'center',
                          border: item.aiBadge ? '1.5px solid var(--primary)' : '1px solid rgba(226,232,240,0.7)',
                          backgroundColor: item.aiBadge ? 'rgba(16, 185, 129, 0.01)' : 'rgba(255, 255, 255, 0.65)'
                        }}
                      >
                        <OptimizedImage
                          src={item.image}
                          alt={item.name}
                          category={item.category}
                          style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }}
                        />

                        <div>
                          {item.aiBadge && (
                            <span style={{
                              display: 'inline-block',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              color: 'var(--primary)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              marginBottom: '0.4rem'
                            }}>
                              {item.aiBadge}
                            </span>
                          )}

                          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', margin: '0 0 0.25rem 0' }}>{item.name}</h3>
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, color: 'var(--foreground)' }}>
                              <Store size={12} /> {item.shopName}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Star size={11} fill="#eab308" color="#eab308" /> {item.shopRating}
                            </span>
                            <span>•</span>
                            <span>📍 {(item.distance / 1000).toFixed(1)} km</span>
                            <span>•</span>
                            <span>🕒 {item.deliveryTime}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' }}>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '1.25rem', color: 'var(--foreground)', display: 'block' }}>₹{item.price}</strong>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: item.stock === 0 ? '#ef4444' : 'var(--primary)'
                            }}>
                              {item.stock === 0 ? 'Out of stock' : `⚡ Only ${item.stock} left`}
                            </span>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleAddItem(item)}
                            disabled={item.stock === 0}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: item.stock === 0 ? 'not-allowed' : 'pointer',
                              opacity: item.stock === 0 ? 0.5 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <ShoppingBag size={12} /> Add to Cart
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: AI Quick Suggest details card */}
              <aside style={{ width: '320px', flexShrink: 0, position: 'sticky', top: '100px' }}>
                <div className="glass-card" style={{ padding: '1.5rem', border: '1.5px solid var(--primary)', backgroundColor: 'rgba(16, 185, 129, 0.02)' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground)', margin: 0 }}>AI Smart Suggest</h4>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                    Nexthood AI compares spatial proximity coordinates with merchant inventory logs to recommend the ideal match, balancing cost and delivery speed.
                  </p>

                  <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cheapest Option:</span>
                      <strong style={{ color: 'var(--foreground)' }}>
                        ₹{Math.min(...comparisonResults.map((c) => c.price))}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Nearest Store:</span>
                      <strong style={{ color: 'var(--foreground)' }}>
                        {(Math.min(...comparisonResults.map((c) => c.distance)) / 1000).toFixed(1)} km away
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Average Rating:</span>
                      <strong style={{ color: 'var(--foreground)' }}>
                        {(comparisonResults.reduce((acc, c) => acc + c.shopRating, 0) / comparisonResults.length).toFixed(1)} ★
                      </strong>
                    </div>
                  </div>
                </div>
              </aside>

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
              <Search size={40} style={{ margin: '0 auto 1rem auto', color: '#cbd5e1' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>No comparison listings fetched yet</h3>
              <p style={{ fontSize: '0.85rem' }}>Type a query in the search bar above or choose a quick pill filter to find products.</p>
            </div>
          )}

        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
