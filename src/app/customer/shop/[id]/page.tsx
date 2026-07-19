'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart, Product, ShopDetails } from '@/context/CartContext';
import OptimizedImage from '@/components/OptimizedImage';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Clock, AlertTriangle, ShieldCheck, Heart, ShoppingBag, Eye, Zap, Flame } from 'lucide-react';

function getMockProducts(category: string, shopId: string): Product[] {
  const cat = category.toLowerCase();
  
  if (cat.includes('bakery') || cat.includes('cake') || cat.includes('confectionery')) {
    return [
      {
        id: `${shopId}-p1`,
        name: 'Premium Chocolate Fudge Cake',
        price: 450,
        description: 'Rich dark chocolate cake layered with decadent fudge frosting.',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60',
        category: 'Cakes',
        discount: '10% OFF',
        deliveryTime: 'Delivery 25 mins',
        rating: 4.8,
        isBestSeller: true
      },
      {
        id: `${shopId}-p2`,
        name: 'Fresh Bread Loaf',
        price: 60,
        description: 'Freshly baked classic soft white bread loaf.',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60',
        category: 'Bread',
        discount: '5% OFF',
        deliveryTime: 'Delivery 15 mins',
        rating: 4.3,
        isBestSeller: false
      },
      {
        id: `${shopId}-p3`,
        name: 'Chocolate Chip Cookies',
        price: 120,
        description: 'Crispy on the outside, chewy on the inside cookies.',
        image: 'https://images.unsplash.com/photo-1499636136210-6f4ee9127357?w=400&auto=format&fit=crop&q=60',
        category: 'Cookies',
        discount: '12% OFF',
        deliveryTime: 'Delivery 12 mins',
        rating: 4.5,
        isBestSeller: true
      },
      {
        id: `${shopId}-p4`,
        name: 'Glazed Donuts (Pack of 4)',
        price: 80,
        description: 'Classic glazed sweet ring donuts.',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&auto=format&fit=crop&q=60',
        category: 'Pastries',
        discount: '15% OFF',
        deliveryTime: 'Delivery 18 mins',
        rating: 4.4,
        isBestSeller: false
      },
      {
        id: `${shopId}-p5`,
        name: 'Vanilla Cupcakes',
        price: 90,
        description: 'Fluffy vanilla cupcakes topped with buttercream frosting.',
        image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=60',
        category: 'Cakes',
        discount: '8% OFF',
        deliveryTime: 'Delivery 20 mins',
        rating: 4.6,
        isBestSeller: false
      }
    ];
  }

  if (cat.includes('pharmacy') || cat.includes('medicine') || cat.includes('chemist') || cat.includes('health') || cat.includes('medical')) {
    return [
      {
        id: `${shopId}-p1`,
        name: 'Paracetamol 650mg (15 Tablets)',
        price: 30,
        description: 'Fast relief from pain and fever.',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
        category: 'OTC Medicines',
        discount: '5% OFF',
        deliveryTime: 'Delivery 10 mins',
        rating: 4.7,
        isBestSeller: true
      },
      {
        id: `${shopId}-p2`,
        name: 'Vitamin C + Zinc Tablets',
        price: 180,
        description: 'Daily immunity boosting tablets.',
        image: 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?w=400&auto=format&fit=crop&q=60',
        category: 'Vitamins',
        discount: '10% OFF',
        deliveryTime: 'Delivery 15 mins',
        rating: 4.5,
        isBestSeller: false
      },
      {
        id: `${shopId}-p3`,
        name: 'Complete First Aid Kit',
        price: 350,
        description: 'Essential bandages, antiseptics, and tools.',
        image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=60',
        category: 'First Aid',
        discount: '15% OFF',
        deliveryTime: 'Delivery 12 mins',
        rating: 4.8,
        isBestSeller: true
      },
      {
        id: `${shopId}-p4`,
        name: 'Instant Hand Sanitizer (250ml)',
        price: 80,
        description: 'Kills 99.9% of germs instantly.',
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=60',
        category: 'Sanitizers',
        discount: '20% OFF',
        deliveryTime: 'Delivery 8 mins',
        rating: 4.4,
        isBestSeller: false
      },
      {
        id: `${shopId}-p5`,
        name: 'N95 Protective Masks (Pack of 5)',
        price: 50,
        description: '5-layer filtration high protection face masks.',
        image: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?w=400&auto=format&fit=crop&q=60',
        category: 'Masks',
        discount: '25% OFF',
        deliveryTime: 'Delivery 9 mins',
        rating: 4.6,
        isBestSeller: false
      }
    ];
  }

  // Grocery Store Fallback Default products
  return [
    {
      id: `${shopId}-p1`,
      name: 'Fresh Organic Milk (1L)',
      price: 58,
      description: 'Farm-fresh pasteurized organic whole milk.',
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60',
      category: 'Dairy',
      discount: '₹5 OFF',
      deliveryTime: 'Delivery 15 mins',
      rating: 4.6,
      isBestSeller: true
    },
    {
      id: `${shopId}-p2`,
      name: 'Basmati Rice (1kg)',
      price: 75,
      description: 'Extra long grain premium aromatic basmati rice.',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60',
      category: 'Grains',
      discount: '10% OFF',
      deliveryTime: 'Delivery 25 mins',
      rating: 4.5,
      isBestSeller: true
    },
    {
      id: `${shopId}-p3`,
      name: 'Fresh Eggs (Pack of 12)',
      price: 80,
      description: 'Naturally raised farm fresh brown eggs.',
      image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=60',
      category: 'Dairy & Eggs',
      discount: '15% OFF',
      deliveryTime: 'Delivery 12 mins',
      rating: 4.3,
      isBestSeller: false
    },
    {
      id: `${shopId}-p4`,
      name: 'Sugar (1kg)',
      price: 48,
      description: 'Finely granulated organic white cane sugar.',
      image: 'https://images.unsplash.com/photo-1581781870027-04212e231e96?w=400&auto=format&fit=crop&q=60',
      category: 'Pantry',
      discount: '5% OFF',
      deliveryTime: 'Delivery 16 mins',
      rating: 4.0,
      isBestSeller: false
    }
  ];
}

export default function ShopInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;
  const { addToCart, cartCount, cartItems, updateQuantity } = useCart();

  const [shop, setShop] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time toast notifications
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

  const addToast = (message: string, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Live Inventory State
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [pulseProducts, setPulseProducts] = useState<Record<string, boolean>>({});
  const [floatingMessages, setFloatingMessages] = useState<Record<string, { text: string; id: number }[]>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Live Activity Metrics
  const [viewerCount, setViewerCount] = useState<number>(3);
  const [recentPurchases, setRecentPurchases] = useState<string[]>([]);

  // Stress Test State
  const [stressTesting, setStressTesting] = useState(false);
  const [stressTestResult, setStressTestResult] = useState<any>(null);
  
  // Similar shops state
  const [similarShops, setSimilarShops] = useState<any[]>([]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    addToast(!favorites[id] ? 'Added to Wishlist' : 'Removed from Wishlist', 'success');
  };

  // Helper to trigger pulse highlight
  const triggerPulse = (productId: string) => {
    setPulseProducts((prev) => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setPulseProducts((prev) => ({ ...prev, [productId]: false }));
    }, 500);
  };

  // Helper to add floating updates
  const triggerFloatingMessage = (productId: string, text: string) => {
    const msgId = Date.now() + Math.random();
    setFloatingMessages((prev) => {
      const current = prev[productId] || [];
      return { ...prev, [productId]: [...current, { text, id: msgId }] };
    });
    setTimeout(() => {
      setFloatingMessages((prev) => {
        const current = prev[productId] || [];
        return { ...prev, [productId]: current.filter((m) => m.id !== msgId) };
      });
    }, 3000);
  };

  // 1. Resolve Shop Details
  useEffect(() => {
    async function fetchShopDetails() {
      try {
        const res = await fetch(`/api/places/details?id=${shopId}`);
        let name = 'Local Store';
        let category = 'Grocery Store';
        let lat = 0;
        let lon = 0;
        let address = '';
        let rating = 4.2;
        let reviewsCount = 25;
        let isOpen = true;
        let photoUrl = undefined;
        let isRegistered = false;
        let productsData: any[] = [];
        let data: any = null;

        if (res.ok) {
          data = await res.json();
          if (data.business) {
            const b = data.business;
            name = b.name;
            category = b.category;
            lat = b.lat;
            lon = b.lon;
            address = b.address;
            rating = b.rating;
            reviewsCount = b.reviewsCount;
            isOpen = b.isOpen;
            photoUrl = b.photoUrl;
            isRegistered = !!b.isRegistered;
          }
          if (data.products && data.products.length > 0) {
            productsData = data.products.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: parseFloat(p.price || '0'),
              description: p.description,
              image: p.images.split(',')[0],
              category: p.category,
              discount: p.discount,
              deliveryTime: p.delivery_type === 'Express' ? 'Delivery 12 mins' : 'Delivery 25 mins',
              rating: parseFloat(p.rating || '0') || 4.5,
              isBestSeller: p.tags?.includes('Best Seller') || p.tags?.includes('best'),
              brand: p.brand || 'Local Brand',
              unit: p.weight || 'unit',
              stock: parseInt(p.stock) || 0
            }));
          }
        }

        // Fallback mock seeding
        if (productsData.length === 0) {
          productsData = getMockProducts(category, shopId);
        }

        const details: any = {
          id: shopId,
          name,
          category,
          lat,
          lon,
          address: address || 'No.24 Gandhi Street, Tambaram, Chennai',
          phone: data?.seller?.mobile_number || '+91 98450 12345',
          email: data?.seller?.email || 'support@nexthood-merchant.com',
          openingHours: '09:00 AM - 10:00 PM',
          rating: rating || 4.2,
          reviewsCount: reviewsCount || 25,
          isOpen: isOpen !== undefined ? isOpen : true,
          photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&auto=format&fit=crop&q=60',
          isRegistered: isRegistered,
          ownerName: data?.seller?.owner_name || 'Hariharan R',
          registeredSince: 'July 2026'
        };

        setShop(details);
        setProducts(productsData);

        // Map initial stocks
        const initStocks: Record<string, number> = {};
        productsData.forEach((p) => {
          initStocks[p.id] = p.stock !== undefined ? p.stock : 25;
        });
        setStocks(initStocks);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchShopDetails();
  }, [shopId]);

  // 2. WebSocket Real-Time synchronization
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    setWs(socket);

    socket.onopen = () => {
      console.log(`[DEBUG] Shop details WebSocket subscribing to shopId: ${shopId}`);
      socket.send(JSON.stringify({
        type: 'subscribe',
        shopId: shopId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[DEBUG] Shop details page WS incoming payload:', data);
        
        if (data.type === 'stock_update') {
          const { productId, stock, updateType, change } = data;
          
          if (productId === 'STATUS_SYNC') return; // ignore status notification

          // Update stock value locally
          setStocks((prev) => ({
            ...prev,
            [productId]: stock
          }));

          triggerPulse(productId);

          // Add floating log visual alert
          if (updateType === 'reserve') {
            triggerFloatingMessage(productId, `🔥 Reserved ${Math.abs(change)} by neighbor`);
            addToast(`Stock reserved for item by another customer`, 'info');
          } else if (updateType === 'release') {
            triggerFloatingMessage(productId, `🟢 Restored +${change} stock units`);
            addToast(`Stock units returned to active pool`, 'success');
          } else if (updateType === 'restock') {
            triggerFloatingMessage(productId, `⚡ Shop Restocked +${change}`);
            addToast(`Merchant restocked item!`, 'success');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      socket.close();
    };
  }, [shopId]);

  // 3. Simulate Activity Logs
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(() => Math.floor(Math.random() * 8) + 2);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    const interval = setInterval(() => {
      const names = ['Amit', 'Rajesh', 'Priya', 'Deepika', 'Karthik', 'Sanjay', 'Harini'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomProd = products[Math.floor(Math.random() * products.length)];
      const randomQty = Math.floor(Math.random() * 2) + 1;
      
      setRecentPurchases((prev) => {
        const log = `🛍️ ${randomName} checked out ${randomQty}x ${randomProd.name}`;
        return [log, ...prev.slice(0, 3)];
      });
    }, 12000);
    return () => clearInterval(interval);
  }, [products]);

  // 4. Simulate Merchant Restocking Handler
  const handleSimulateRestock = async () => {
    for (const prod of products) {
      const newStock = (stocks[prod.id] || 0) + 15;
      
      try {
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId: shopId,
            productId: prod.id,
            action: 'restock',
            quantity: 15
          })
        });

        if (response.ok) {
          // Broadcast to WS
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'broadcast_update',
              shopId: shopId,
              productId: prod.id,
              stock: newStock,
              updateType: 'restock',
              change: 15
            }));
          }
          
          setStocks((prev) => ({
            ...prev,
            [prod.id]: newStock
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    addToast('⚡ Simulated store-wide merchant restock!', 'success');
  };

  // 5. Concurrency Stress Test Simulator
  const handleRunStressTest = async () => {
    if (products.length === 0) return;
    setStressTesting(true);
    setStressTestResult(null);
    addToast('🧪 Starting concurrency checkout stress test...', 'info');

    const targetProduct = products[0];
    const initialStock = stocks[targetProduct.id] || 0;

    try {
      const res = await fetch('/api/inventory/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopId,
          productId: targetProduct.id,
          concurrencyCount: 10,
          quantityPerCheckout: 1
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStressTestResult(data);
        
        // Sync new stock
        setStocks((prev) => ({
          ...prev,
          [targetProduct.id]: data.finalStock
        }));

        // Broadcast stress test update
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'broadcast_update',
            shopId: shopId,
            productId: targetProduct.id,
            stock: data.finalStock,
            updateType: 'reserve',
            change: -(initialStock - data.finalStock)
          }));
        }
        addToast('🧪 Stress test completed successfully!', 'success');
      } else {
        addToast('🧪 Stress test encounter server failure.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('🧪 Network error running stress test.', 'error');
    } finally {
      setStressTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <Header />
        <div className="container" style={{ maxWidth: '1100px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="shimmer skeleton-title" style={{ height: '40px', width: '50%' }}></div>
          <div className="shimmer skeleton-image" style={{ height: '160px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div className="shimmer skeleton-image" style={{ height: '280px' }}></div>
            <div className="shimmer skeleton-image" style={{ height: '280px' }}></div>
            <div className="shimmer skeleton-image" style={{ height: '280px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) return null;

  return (
    <>
      <Header currentUser={{ name: shop.ownerName, role: 'Customer' }} />
      
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '2rem 1.5rem', fontFamily: 'var(--font-family)' }}>
        
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Back Navigation Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/customer/home" style={{
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none'
            }}>
              <ArrowLeft size={16} /> Back to Map Search
            </Link>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Flame size={14} color="#ea580c" /> {viewerCount} neighbors are viewing menu
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSimulateRestock}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', borderColor: 'var(--primary)', color: 'var(--primary)', borderRadius: '10px' }}
              >
                <Zap size={12} style={{ marginRight: '0.25rem' }} /> Restock Products (+15)
              </motion.button>
            </div>
          </div>

          {/* Shop Header Banner */}
          <div className="glass-card" style={{
            padding: '2rem',
            display: 'grid',
            gridTemplateColumns: '1fr 180px',
            gap: '2rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--primary)'
                }}>
                  {shop.category}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: shop.isRegistered ? '#10b981' : '#64748b',
                  padding: '2px 8px',
                  borderRadius: '20px'
                }}>
                  {shop.isRegistered ? '🏪 Verified Partner Store' : 'Demo Shop'}
                </span>
              </div>

              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.2rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--foreground)',
                margin: '0 0 0.5rem 0'
              }}>
                {shop.name}
              </h1>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
                👤 Operated by <strong>{shop.ownerName}</strong> • Sourcing since {shop.registeredSince}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <span>📍 <strong>Address:</strong> {shop.address}</span>
                <span>📞 <strong>Mobile:</strong> {shop.phone}</span>
                <span>📧 <strong>Email:</strong> {shop.email}</span>
                <span>🕒 <strong>Operating Hours:</strong> {shop.openingHours}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                  <span style={{ color: '#eab308', display: 'flex' }}><Star size={14} fill="#eab308" /></span>
                  <strong style={{ fontSize: '0.95rem' }}>{shop.rating}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>({shop.reviewsCount} reviews)</span>
                </div>
                <span style={{
                  fontSize: '0.8rem',
                  color: shop.isOpen ? '#10b981' : '#ef4444',
                  fontWeight: 700
                }}>
                  {shop.isOpen ? '🟢 Open Now' : '🔴 Closed'}
                </span>
              </div>
            </div>

            {/* Header Right Action Column */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', borderLeft: '1px solid rgba(226,232,240,0.6)', paddingLeft: '2rem' }}>
              {shop.photoUrl ? (
                <img
                  src={shop.photoUrl}
                  alt={shop.name}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🏪</div>
              )}
              
              {cartCount > 0 && (
                <Link href="/customer/checkout" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                  width: '100%',
                  justifyContent: 'center'
                }}>
                  <ShoppingBag size={14} /> Checkout ({cartCount})
                </Link>
              )}
            </div>
          </div>

          {/* Activity log feed */}
          {recentPurchases.length > 0 && (
            <div className="glass-card" style={{ padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Eye size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Feed:</span>
              <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)' }}>
                {recentPurchases[0]}
              </div>
            </div>
          )}

          {/* Catalog Layout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
              In-Stock Product Menu
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Real-time stock counts synced</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem'
          }}>
            {products.map((product) => {
              const stock = stocks[product.id] !== undefined ? stocks[product.id] : 25;
              const isPulse = pulseProducts[product.id] || false;
              const productMessages = floatingMessages[product.id] || [];

              // Check if item is in cart to render quantities controls
              const cartItem = cartItems.find((item) => item.product.id === product.id);

              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: `1.5px solid ${isPulse ? 'var(--primary)' : 'rgba(226, 232, 240, 0.7)'}`,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                >
                  {/* Floating Action Notifications */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {productMessages.map((m) => (
                      <span key={m.id} style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#ffffff', fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        {m.text}
                      </span>
                    ))}
                  </div>

                  {/* Favorite / Wishlist button */}
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      zIndex: 5,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    <Heart size={16} fill={favorites[product.id] ? '#ef4444' : 'none'} color={favorites[product.id] ? '#ef4444' : 'var(--text-muted)'} />
                  </button>

                  <div style={{ position: 'relative' }}>
                    <OptimizedImage
                      src={product.image}
                      alt={product.name}
                      category={product.category}
                      style={{
                        height: '180px',
                        borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
                        borderRadius: '0'
                      }}
                    />
                    {product.isBestSeller && (
                      <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '20px'
                      }}>
                        ★ Best Seller
                      </span>
                    )}
                  </div>
                  
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3, marginBottom: '0.25rem' }}>
                            {product.name}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                            Brand: {(product as any).brand || 'Local Brand'} • {(product as any).unit || 'unit'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--foreground)' }}>₹{product.price}</strong>
                          {product.discount && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>{product.discount}</span>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.75rem 0', lineHeight: 1.4 }}>
                        {product.description || 'Quality product sourced locally.'}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          ETA: {product.deliveryTime || '15 mins'}
                        </span>
                        
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: stock === 0 ? '#ef4444' : stock <= 5 ? '#f59e0b' : '#10b981',
                          backgroundColor: stock === 0 ? '#fee2e2' : stock <= 5 ? '#fef3c7' : '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: '20px'
                        }}>
                          {stock === 0 ? '❌ Sold Out' : `${stock} Left`}
                        </span>
                      </div>
                    </div>

                    {/* Add to Cart Actions */}
                    <div>
                      {stock === 0 ? (
                        <button disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}>
                          Out of Stock
                        </button>
                      ) : cartItem ? (
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--primary)', borderRadius: '10px', overflow: 'hidden' }}>
                          <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} style={{ flex: 1, padding: '0.6rem', border: 'none', background: '#ffffff', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>-</button>
                          <span style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>{cartItem.quantity}</span>
                          <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} style={{ flex: 1, padding: '0.6rem', border: 'none', background: '#ffffff', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>+</button>
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            addToCart(product, shop);
                            addToast(`Added ${product.name} to cart`, 'success');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1.5px solid var(--primary)',
                            background: '#ffffff',
                            borderRadius: '10px',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Add to Cart
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Concurrency Simulator & Stress Testing Panel */}
          {shop.isRegistered && (
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid rgba(226,232,240,0.6)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Concurrency & Mutex Stress Tester</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Verify transactional integrity. Running this test will simulate <strong>10 concurrent buyers</strong> checking out 1 unit of product <strong>{products[0]?.name || 'simulated item'}</strong> at the exact same millisecond. The inventory lock prevents negative stock states.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRunStressTest}
                  disabled={stressTesting || products.length === 0}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', borderRadius: '10px' }}
                >
                  {stressTesting ? '🧪 Running Test...' : '🧪 Run 10-User Concurrency checkout'}
                </motion.button>
              </div>

              {stressTestResult && (
                <div style={{ marginTop: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--foreground)' }}>Test Output Results:</strong>
                  <span>📊 Total Requests Dispatched: {stressTestResult.requestsDispatched}</span>
                  <span style={{ color: '#10b981' }}>🟢 Successful checkouts: {stressTestResult.successCount}</span>
                  <span style={{ color: '#ef4444' }}>🔴 Blocked due to Stock Limits: {stressTestResult.failedCount}</span>
                  <span>⚙️ Final Stock Count in database: <strong>{stressTestResult.finalStock}</strong></span>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Toast Notification Container */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10000 }}>
        {toasts.map(t => (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            key={t.id}
            style={{
              backgroundColor: t.type === 'error' ? '#fee2e2' : '#ecfdf5',
              color: t.type === 'error' ? '#991b1b' : '#065f46',
              border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#10b981'}`,
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {t.message}
          </motion.div>
        ))}
      </div>
    </>
  );
}
