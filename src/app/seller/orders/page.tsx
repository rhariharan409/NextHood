'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  brand?: string;
  unit?: string;
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
  items: OrderItem[];
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Stats
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [preparingOrdersCount, setPreparingOrdersCount] = useState(0);
  const [deliveredOrdersCount, setDeliveredOrdersCount] = useState(0);
  const [cancelledOrdersCount, setCancelledOrdersCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);

  const checkAuthAndLoad = async () => {
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
        await loadOrders(data.user.id);
      } else {
        router.push('/seller/auth');
      }
    } catch (err) {
      router.push('/seller/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (sellerId: string) => {
    try {
      const res = await fetch(`/api/orders?shopId=${sellerId}`);
      if (res.ok) {
        const data = await res.json();
        const sellerOrders: OrderRecord[] = data.orders || [];
        
        // Sort orders so newer ones are on top
        sellerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(sellerOrders);

        // Calculate statistics dynamically
        const todayStr = new Date().toDateString();
        const todayList = sellerOrders.filter(o => new Date(o.created_at).toDateString() === todayStr);
        
        setTodayOrdersCount(todayList.length);
        setPendingOrdersCount(sellerOrders.filter(o => o.status === 'Pending').length);
        setPreparingOrdersCount(sellerOrders.filter(o => o.status === 'Preparing').length);
        setDeliveredOrdersCount(sellerOrders.filter(o => o.status === 'Delivered').length);
        setCancelledOrdersCount(sellerOrders.filter(o => o.status === 'Cancelled').length);

        const rev = todayList
          .filter(o => o.status !== 'Cancelled')
          .reduce((acc, o) => acc + (o.grandTotal || 0), 0);
        setTodayRevenue(rev);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Real-time polling updates every 3 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadOrders(user.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok) {
        if (user) {
          await loadOrders(user.id);
        }
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)', color: 'var(--text-muted)' }}>
        Loading merchant orders portal...
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Seller' }} onLogout={handleLogout} />
      
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <Link href="/seller/home" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)'
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
              fontWeight: 600,
              color: 'var(--primary)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)'
            }}>
              📦 My Orders
            </Link>
          </div>

          {/* Page Title */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>
              Order Dispatch Center
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foreground)', marginTop: '0.25rem' }}>
              My Shop Orders
            </h1>
          </div>

          {/* Dynamic Statistics Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Today's Orders</span>
              <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>{todayOrdersCount}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pending</span>
              <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#f59e0b' }}>{pendingOrdersCount}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Preparing</span>
              <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: 'var(--primary)' }}>{preparingOrdersCount}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Delivered</span>
              <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#10b981' }}>{deliveredOrdersCount}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Cancelled</span>
              <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#ef4444' }}>{cancelledOrdersCount}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Today's Revenue</span>
              <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#10b981' }}>₹{todayRevenue.toFixed(2)}</strong>
            </div>
          </div>

          {/* Orders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {orders.length === 0 ? (
              <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No customer orders received yet.
              </div>
            ) : (
              orders.map((order) => {
                const date = new Date(order.created_at).toLocaleString();
                const totalItemsCount = order.items.reduce((acc, i) => acc + i.quantity, 0);

                return (
                  <div key={order.orderId} className="card" style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {/* Card Header */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '1.25rem 2rem',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order ID</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--foreground)', display: 'block', fontFamily: 'monospace' }}>
                          {order.orderNumber || order.orderId}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order Placed</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--foreground)', display: 'block', fontWeight: 500 }}>
                          {date}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Payment Method</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--foreground)', display: 'block', fontWeight: 600 }}>
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (UPI)'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</span>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: order.status === 'Cancelled' ? '#ef4444' : order.status === 'Delivered' ? '#10b981' : '#f59e0b',
                          backgroundColor: order.status === 'Cancelled' ? '#fee2e2' : order.status === 'Delivered' ? '#d1fae5' : '#fef3c7',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          display: 'block',
                          textAlign: 'center',
                          marginTop: '0.15rem'
                        }}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2.5rem' }}>
                      {/* Products Ordered */}
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--foreground)' }}>
                          Products Ordered ({totalItemsCount} units)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {order.items.map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '6px',
                                    objectFit: 'cover',
                                    border: '1px solid var(--border)'
                                  }}
                                />
                              ) : (
                                <div style={{ width: '50px', height: '50px', borderRadius: '6px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                              )}
                              <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--foreground)', display: 'block' }}>{item.name}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {item.brand && `Brand: ${item.brand} • `}{item.unit && `Unit: ${item.unit}`}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>
                                  Qty: <strong>{item.quantity}</strong>
                                </span>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>
                                  ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                </strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer Details & Actions */}
                      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--foreground)' }}>
                            Customer Details
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                            <span>👤 <strong>Name:</strong> {order.customerName}</span>
                            <span>📍 <strong>Address:</strong></span>
                            <p style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {order.deliveryAddress}
                            </p>
                          </div>

                          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                              <span>Subtotal:</span>
                              <strong>₹{order.subtotal.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <span>Delivery Charge:</span>
                              <span>₹{order.deliveryCharge.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                              <strong style={{ fontSize: '1rem' }}>Grand Total:</strong>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>₹{order.grandTotal.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Order Action Selector */}
                        <div style={{ marginTop: '1.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                            Change Order Status:
                          </span>
                          <select
                            value={order.status}
                            disabled={updatingOrderId === order.orderId}
                            onChange={(e) => handleStatusChange(order.orderId, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              backgroundColor: '#ffffff',
                              color: 'var(--foreground)',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Packed">Packed</option>
                            <option value="Out For Delivery">Out For Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>
    </>
  );
}
