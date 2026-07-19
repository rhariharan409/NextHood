'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  role: string;
  name: string; // business_name
}

interface OrderRecord {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  storeName: string;
  grandTotal: number;
  subtotal: number;
  deliveryCharge: number;
  platformFee: number;
  tax: number;
  paymentMethod: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  created_at: string;
  status: string;
  items: any[];
  logisticsPlan?: {
    vehicle: string;
    icon: string;
    reason: string;
    deliveryTime: string;
    fuelCost: number;
    distance: number;
    co2Saved: string;
    driverName: string;
    expectedPickup: string;
  };
}

export default function SellerHomePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Shop details
  const [shopAddress, setShopAddress] = useState('');
  const [shopCategory, setShopCategory] = useState('');
  const [productsCount, setProductsCount] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [lowStockAlertsCount, setLowStockAlertsCount] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);

  // Toggles / controls for Future Ready setup
  const [trafficAPIEnabled, setTrafficAPIEnabled] = useState(true);
  const [weatherAPIEnabled, setWeatherAPIEnabled] = useState(false);
  const [evOnlyEnabled, setEvOnlyEnabled] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/seller/auth');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user.role === 'seller') {
          if (!data.profileCompleted) {
            router.push('/seller/complete-profile');
            return;
          }
          setUser(data.user);
        } else {
          router.push('/seller/auth');
          return;
        }

        // Load active orders from backend database
        const ordersRes = await fetch(`/api/orders?shopId=${data.user.id}`);
        let processed: OrderRecord[] = [];
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          processed = ordersData.orders || [];
        }

        // Fetch shop profile details
        const shopRes = await fetch(`/api/places/details?id=${data.user.id}`);
        if (shopRes.ok) {
          const shopData = await shopRes.json();
          if (shopData.business) {
            setShopAddress(shopData.business.address);
            setShopCategory(shopData.business.category);
          }
        }

        // Load seller products count, inventory, and revenue from backend
        const productsRes = await fetch('/api/seller/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const sellerProds = productsData.products || [];
          setProductsCount(sellerProds.length);
          
          const inventorySum = sellerProds.reduce((acc: number, p: any) => acc + (parseInt(p.stock) || 0), 0);
          setTotalInventory(inventorySum);
          
          const revenueSum = sellerProds.reduce((acc: number, p: any) => acc + (parseFloat(p.revenue) || 0), 0);
          setRevenue(revenueSum);

          const lowStockCount = sellerProds.filter((p: any) => (parseInt(p.stock) || 0) <= (parseInt(p.min_stock_alert) || 5)).length;
          setLowStockAlertsCount(lowStockCount);

          const valueSum = sellerProds.reduce((acc: number, p: any) => acc + (parseInt(p.stock) || 0) * (parseFloat(p.price) || 0), 0);
          setInventoryValue(valueSum);
        }

        setOrders(processed);
      } catch (err) {
        router.push('/seller/auth');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Poll for new orders and dashboard statistics updates every 3 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
      try {
        const ordersRes = await fetch(`/api/orders?shopId=${user.id}`);
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.orders || []);
        }

        // Also poll for products, stock and revenue updates
        const productsRes = await fetch('/api/seller/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const sellerProds = productsData.products || [];
          setProductsCount(sellerProds.length);
          
          const inventorySum = sellerProds.reduce((acc: number, p: any) => acc + (parseInt(p.stock) || 0), 0);
          setTotalInventory(inventorySum);
          
          const revenueSum = sellerProds.reduce((acc: number, p: any) => acc + (parseFloat(p.revenue) || 0), 0);
          setRevenue(revenueSum);

          const lowStockCount = sellerProds.filter((p: any) => (parseInt(p.stock) || 0) <= (parseInt(p.min_stock_alert) || 5)).length;
          setLowStockAlertsCount(lowStockCount);

          const valueSum = sellerProds.reduce((acc: number, p: any) => acc + (parseInt(p.stock) || 0) * (parseFloat(p.price) || 0), 0);
          setInventoryValue(valueSum);
        }
      } catch (err) {
        console.error('Error polling for updates:', err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user]);

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
        Loading your Nexthood seller profile...
      </div>
    );
  }

  if (!user) return null;

  // Analytics Computations
  const bikeCount = orders.filter(o => o.logisticsPlan?.vehicle.includes('Bike')).length;
  const carCount = orders.filter(o => o.logisticsPlan?.vehicle.includes('Car')).length;
  const vanCount = orders.filter(o => o.logisticsPlan?.vehicle.includes('Van')).length;
  const truckCount = orders.filter(o => o.logisticsPlan?.vehicle.includes('Truck') || o.logisticsPlan?.vehicle.includes('Lorry')).length;
  const refrigeratedCount = orders.filter(o => o.logisticsPlan?.vehicle.includes('Refrigerated')).length;

  const totalFuelCost = orders.reduce((acc, o) => acc + (o.logisticsPlan?.fuelCost || 0), 0);
  const potentialVanCost = orders.length * 90; // mock comparison if we used vans for everything
  const fuelSavings = Math.max(0, potentialVanCost - totalFuelCost);
  
  const co2SavingsPercent = Math.round(
    orders.reduce((acc, o) => {
      const co2Str = o.logisticsPlan?.co2Saved || '0%';
      const val = parseInt(co2Str) || 0;
      return acc + val;
    }, 0) / Math.max(1, orders.length)
  );

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Seller' }} onLogout={handleLogout} />
      
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <Link href="/seller/home" style={{
              fontWeight: 600,
              color: 'var(--primary)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)'
            }}>
              🚚 Dispatches & Orders
            </Link>
            <Link href="/seller/products" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)'
            }}>
              📦 Product Management
            </Link>
            <Link href="/seller/orders" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)'
            }}>
              📦 My Orders
            </Link>
          </div>

          {/* Top welcome */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>
                Seller Portal
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foreground)', marginTop: '0.25rem' }}>
                Welcome, {user.name}
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ backgroundColor: 'var(--primary)', color: '#ffffff', padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700 }}>
                🟢 Live Dispatch Online
              </span>
            </div>
          </div>

          {/* Business Information Card */}
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '2rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🏪 GPS Verified Marketplace Shop
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                {user.name}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Category: <strong>{shopCategory || 'Grocery Store'}</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>📍 <strong>Address:</strong> {shopAddress || 'Loading address...'}</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Active Products</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>{productsCount}</strong>
              </div>
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Stock Units</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>{totalInventory} units</strong>
              </div>
              <div style={{ padding: '1rem', background: lowStockAlertsCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-2)', borderRadius: '8px', border: `1px solid ${lowStockAlertsCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}` }}>
                <span style={{ fontSize: '0.75rem', color: lowStockAlertsCount > 0 ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Low Stock Alerts</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: lowStockAlertsCount > 0 ? '#ef4444' : 'var(--foreground)' }}>{lowStockAlertsCount} alerts</strong>
              </div>
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Inventory Value</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>₹{inventoryValue.toFixed(2)}</strong>
              </div>
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Orders Received</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>{orders.length}</strong>
              </div>
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Revenue Earned</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#10b981' }}>₹{revenue}</strong>
              </div>
            </div>
          </div>

          {/* Admin Analytics Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Total Fleet Dispatches
              </span>
              <strong style={{ fontSize: '2rem' }}>{orders.length}</strong>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>🏍 {bikeCount}</span>
                <span>🚗 {carCount}</span>
                <span>🚐 {vanCount}</span>
                <span>🚚 {truckCount}</span>
                <span>❄ {refrigeratedCount}</span>
              </div>
            </div>

            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Estimated Fuel Savings
              </span>
              <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>₹{fuelSavings}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                By optimizing vehicle class sizing
              </span>
            </div>

            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Avg Fleet CO₂ Saved
              </span>
              <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>{co2SavingsPercent}%</strong>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <div style={{ width: `${co2SavingsPercent}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
              </div>
            </div>

            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Avg Delivery Time
              </span>
              <strong style={{ fontSize: '2rem' }}>14.8 Min</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Fastest localized routing plan
              </span>
            </div>
          </div>

          {/* Active Deliveries log */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Received Marketplace Orders ({orders.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  No orders received yet. Active orders placed by customers will appear here in real-time.
                </div>
              ) : (
                orders.map((ord) => (
                  <div key={ord.orderId} style={{
                    padding: '1.5rem',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1.2fr 1fr',
                    gap: '1.5rem',
                    alignItems: 'start'
                  }}>
                    {/* Column 1: Order Meta & Products */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary)', color: '#ffffff', padding: '0.2rem 0.5rem', borderRadius: '3px', fontWeight: 700 }}>
                          {ord.orderNumber || ord.orderId}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          🕒 {new Date(ord.created_at || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Customer</span>
                        <strong style={{ fontSize: '0.95rem' }}>{ord.customerName || 'Guest User'}</strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Products Ordered</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {(ord.items || []).map((item: any, idx: number) => (
                            <span key={idx} style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
                              • {item.name || item.product?.name} <strong>x{item.quantity}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Logistics / Delivery details */}
                    <div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Delivery Address</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', display: 'block', lineHeight: '1.4' }}>
                          {ord.deliveryAddress}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Payment Method</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {ord.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Totals & Status */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Total Amount</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>₹{ord.grandTotal}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Status</span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Future Ready settings panel */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Logistics API Extensions (Future Ready)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Toggle logistics API plugins to enrich vehicle selection optimizations dynamically.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', display: 'block' }}>Live Traffic API Plugin</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dynamically re-route vans if high congestion is reported.</span>
                </div>
                <input
                  type="checkbox"
                  checked={trafficAPIEnabled}
                  onChange={(e) => setTrafficAPIEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', display: 'block' }}>Live Weather API Plugin</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Switch to covered vans if rain is forecasted.</span>
                </div>
                <input
                  type="checkbox"
                  checked={weatherAPIEnabled}
                  onChange={(e) => setWeatherAPIEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', display: 'block' }}>Electric Vehicles (EV) Preference</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prioritize electric bikes and scooters over standard petrol counterparts.</span>
                </div>
                <input
                  type="checkbox"
                  checked={evOnlyEnabled}
                  onChange={(e) => setEvOnlyEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Profile Settings & Theme Switch */}
          <div className="card" style={{ backgroundColor: 'var(--card-bg)', padding: '2rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 30px rgba(0,0,0,0.02)', marginTop: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>
                Shop Settings & Profile
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Manage store options and application theme preferences.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--foreground)' }}>Display Theme</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose light mode or dark mode.</span>
              </div>
              <div style={{
                display: 'flex',
                backgroundColor: 'var(--nav-bg)',
                border: '1px solid var(--nav-border)',
                padding: '4px',
                borderRadius: '12px'
              }}>
                {(['light', 'dark', 'system'] as const).map((t) => {
                  const isActive = theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        border: isActive ? '1px solid var(--nav-active-border)' : '1px solid transparent'
                      }}
                    >
                      {t === 'light' ? '🌞 Light' : t === 'dark' ? '🌙 Dark' : '💻 System'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--foreground)' }}>Merchant Account</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in as {user.name} ({user.email})</span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}>
                Logout
              </button>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
