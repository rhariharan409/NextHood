'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

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

// Reusable mock products generator mapping category to products
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
  const pathname = usePathname();
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
            aiBadge: '' // populated next
          });
        }
      }

      // Calculate AI Recommendation Badges
      if (list.length > 0) {
        const sortedPrice = [...list].sort((a, b) => a.price - b.price);
        const sortedDistance = [...list].sort((a, b) => a.distance - b.distance);
        const sortedRating = [...list].sort((a, b) => b.shopRating - a.shopRating);

        list.forEach((item) => {
          if (item.id === sortedPrice[0].id) {
            item.aiBadge = 'Cheapest';
          } else if (item.id === sortedDistance[0].id) {
            item.aiBadge = 'Fastest Delivery';
          } else if (item.id === sortedRating[0].id) {
            item.aiBadge = 'Top Rated';
          } else {
            item.aiBadge = 'Best Value';
          }
        });
      }

      setComparisonResults(list);
    } catch (e) {
      console.error('Smart Search logic failed:', e);
    } finally {
      setSearching(false);
    }
  };

  // Sorting Handler
  const getSortedResults = () => {
    const list = [...comparisonResults];
    switch (sortBy) {
      case 'price_asc':
        return list.sort((a, b) => a.price - b.price);
      case 'rating_desc':
        return list.sort((a, b) => b.shopRating - a.shopRating);
      case 'distance_asc':
        return list.sort((a, b) => a.distance - b.distance);
      case 'delivery_asc':
        // Sort delivery times deterministically by distance
        return list.sort((a, b) => a.distance - b.distance);
      case 'discount_desc':
        return list.sort((a, b) => b.price - a.price); // fallback
      case 'ai':
      default:
        // Best Combination: balance price, rating, and distance
        return list.sort((a, b) => {
          const scoreA = (a.shopRating * 10) - (a.price / 50) - (a.distance / 1000);
          const scoreB = (b.shopRating * 10) - (b.price / 50) - (b.distance / 1000);
          return scoreB - scoreA;
        });
    }
  };

  if (loading || locationLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family)',
        color: 'var(--text-muted)'
      }}>
        Initializing Smart Search comparison engine...
      </div>
    );
  }

  const sortedResults = getSortedResults();

  // Savings computation
  const hasResults = comparisonResults.length > 0;
  const lowestPrice = hasResults ? Math.min(...comparisonResults.map(p => p.price)) : 0;
  const highestPrice = hasResults ? Math.max(...comparisonResults.map(p => p.price)) : 0;
  const amountSaved = highestPrice - lowestPrice;

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
            <Link href="/customer/favorites" style={{
              fontWeight: pathname === '/customer/favorites' ? 600 : 500,
              color: pathname === '/customer/favorites' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Favorites
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

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          
          {/* Headline */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--primary)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              display: 'inline-block',
              marginBottom: '1rem'
            }}>
              AI Engine comparison
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--foreground)',
              marginBottom: '0.5rem'
            }}>
              🔍 Smart Search comparison
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
              Instantly compare prices, distance, stock levels, and delivery times from all local shops near you.
            </p>
          </div>

          {/* Search Inputs Card */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search any product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, minWidth: '280px', border: '1.5px solid var(--border)' }}
                disabled={searching}
              />
              <button
                onClick={() => handleSearch()}
                className="btn btn-primary"
                style={{ padding: '0.85rem 2.5rem' }}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? 'Comparing...' : 'Compare Prices'}
              </button>
            </div>

            {/* Quick Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginTop: '1.25rem', paddingBottom: '0.25rem' }} className="no-scrollbar">
              {exampleSearches.map((pill) => (
                <button
                  key={pill}
                  onClick={() => {
                    setSearchQuery(pill);
                    handleSearch(pill);
                  }}
                  disabled={searching}
                  style={{
                    backgroundColor: searchQuery === pill ? 'rgba(16, 185, 129, 0.08)' : 'var(--secondary)',
                    border: `1px solid ${searchQuery === pill ? 'var(--primary)' : 'var(--border)'}`,
                    color: searchQuery === pill ? 'var(--primary)' : 'var(--foreground)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {hasResults && (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              
              {/* Left Column: Comparisons & Results */}
              <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Sorting Options */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Found <strong>{comparisonResults.length}</strong> listings near you
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="ai">AI Recommendation</option>
                      <option value="price_asc">Lowest Price</option>
                      <option value="rating_desc">Highest Rating</option>
                      <option value="distance_asc">Nearest Shop</option>
                      <option value="delivery_asc">Fastest Delivery</option>
                      <option value="discount_desc">Highest Discount</option>
                    </select>
                  </div>
                </div>

                {/* AI Recommendation Highlight Banner */}
                {sortBy === 'ai' && (
                  <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.04)',
                    border: '1.5px solid var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem 2rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <span style={{
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      display: 'inline-block',
                      marginBottom: '0.75rem'
                    }}>
                      💡 AI Top Recommendation
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {sortedResults[0].name} at {sortedResults[0].shopName}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Recommended because it offers the best value combination of ratings ({sortedResults[0].shopRating}★) and proximity ({(sortedResults[0].distance / 1000).toFixed(1)} km).
                    </p>
                  </div>
                )}

                {/* Comparison Listing Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {sortedResults.map((item) => (
                    <div key={item.id} className="card" style={{
                      backgroundColor: '#ffffff',
                      padding: '1.5rem',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      gap: '1.5rem',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      position: 'relative'
                    }}>
                      {item.aiBadge && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: item.aiBadge === 'Cheapest' ? '#059669' : 'rgba(15, 23, 42, 0.9)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {item.aiBadge}
                        </span>
                      )}

                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)'
                        }}
                      />

                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.category}</span>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>{item.name}</h3>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Shop: <strong style={{ color: 'var(--foreground)' }}>{item.shopName}</strong> ({item.shopRating}★)
                          </span>
                        </div>

                        {/* Badges block */}
                        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>₹{item.price}</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.7er', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance</span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>{(item.distance / 1000).toFixed(1)} km</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivery</span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{item.deliveryTime}</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stock</span>
                            <strong style={{ fontSize: '0.95rem', color: item.stock <= 5 ? '#ef4444' : 'var(--foreground)' }}>
                              {item.stock > 0 ? `${item.stock} left` : 'Sold out'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignSelf: 'stretch', justifyContent: 'center' }}>
                        <Link href={`/customer/shop/${item.shopId}`} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem', textAlign: 'center' }}>
                          View Shop
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Right Column: Estimated Savings summary */}
              <div style={{ width: '340px', position: 'sticky', top: '100px' }}>
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                    Estimated Savings
                  </h3>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                    Nexthood scans all surrounding inventory to make sure you get the best deal.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Lowest Price:</span>
                      <strong>₹{lowestPrice}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Highest Price:</span>
                      <strong>₹{highestPrice}</strong>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Amount Saved</span>
                    <strong style={{ fontSize: '1.5rem', color: '#065f46' }}>₹{amountSaved}</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {!hasResults && searchQuery.trim() && !searching && (
            <div className="card" style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🛍️</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                No listings found
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                No nearby shops currently have this product.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
