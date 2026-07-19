'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
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
  rejectReason?: string;
}

function CustomerOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === 'true';

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

  const addToast = (message: string, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchOrders = async (userId: string) => {
    try {
      const ordersRes = await fetch(`/api/orders?customerId=${userId}`);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const sorted = (data.orders || []).sort(
          (a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  useEffect(() => {
    async function loadUserAndOrders() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/customer/auth');
          return;
        }
        const authData = await authRes.json();
        if (authData.authenticated) {
          setUser(authData.user);
          await fetchOrders(authData.user.id);
        } else {
          router.push('/customer/auth');
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUserAndOrders();
  }, [router]);

  // Real-time synchronization via WebSockets
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log('[DEBUG] Customer WebSocket subscribed to order updates');
      const uniqueSellerIds = Array.from(new Set(orders.map(o => o.sellerId)));
      uniqueSellerIds.forEach(sellerId => {
        socket.send(JSON.stringify({ type: 'subscribe', shopId: sellerId }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stock_update' && data.updateType === 'order_status_change') {
          console.log('[DEBUG] Customer orders list updated via WS broadcast');
          fetchOrders(user.id);
          addToast('🔔 Your order status was updated by the merchant!', 'success');
        }
      } catch (e) {
        console.error('WS customer message error:', e);
      }
    };

    // Backup polling every 4 seconds
    const interval = setInterval(() => {
      fetchOrders(user.id);
    }, 4000);

    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, [user, orders.length]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
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
        Loading your order history...
      </div>
    );
  }

  return (
    <>
      <Header currentUser={user ? { name: user.name, role: 'Customer' } : undefined} onLogout={handleLogout} />

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem', fontFamily: 'var(--font-family)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {showSuccess && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              marginBottom: '2.5rem',
              animation: 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
              <h1 style={{ fontFamily: 'var(--font-display)', color: '#065f46', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                Order Placed Successfully!
              </h1>
              <p style={{ color: '#047857', fontSize: '0.95rem', margin: 0 }}>
                Your order has been recorded and the shop has started preparing your dispatch items.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Your Orders ({orders.length})
            </h2>
            <Link href="/customer/home" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 600 }}>
              🏪 Back to Shops Map
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📦</span>
              <p style={{ fontSize: '1rem', margin: '0 0 1.5rem 0' }}>You haven't placed any orders yet.</p>
              <Link href="/customer/home" className="btn btn-primary" style={{ display: 'inline-block', backgroundColor: 'var(--primary)', color: '#ffffff', textDecoration: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {orders.map((order) => (
                <div key={order.orderId} className="card" style={{ backgroundColor: '#ffffff', padding: '1.75rem', borderRadius: '12px', border: '1.5px solid var(--border)' }}>
                  {/* Order header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Order ID</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>{order.orderNumber}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Store Name</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{order.storeName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Status</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor:
                          order.status === 'Pending' ? '#fef3c7' :
                          order.status === 'Accepted' ? '#d1e7ff' :
                          order.status === 'Packed' ? '#f3e8ff' :
                          order.status === 'Out For Delivery' ? '#e0e7ff' :
                          order.status === 'Delivered' ? '#d1fae5' : '#fee2e2',
                        color:
                          order.status === 'Pending' ? '#b45309' :
                          order.status === 'Accepted' ? '#0b5ed7' :
                          order.status === 'Packed' ? '#7e22ce' :
                          order.status === 'Out For Delivery' ? '#4338ca' :
                          order.status === 'Delivered' ? '#047857' : '#b91c1c',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {order.status}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Ordered On</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Customer Status Message */}
                  <div style={{
                    backgroundColor:
                      order.status === 'Pending' ? '#fffbeb' :
                      order.status === 'Accepted' ? '#f0f9ff' :
                      order.status === 'Packed' ? '#faf5ff' :
                      order.status === 'Out For Delivery' ? '#eef2ff' :
                      order.status === 'Delivered' ? '#f0fdf4' : '#fef2f2',
                    border: '1px solid ' + (
                      order.status === 'Pending' ? '#fef3c7' :
                      order.status === 'Accepted' ? '#d1e7ff' :
                      order.status === 'Packed' ? '#e9d5ff' :
                      order.status === 'Out For Delivery' ? '#c7d2fe' :
                      order.status === 'Delivered' ? '#bbf7d0' : '#fca5a5'
                    ),
                    padding: '0.85rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    marginBottom: '1.25rem',
                    fontWeight: 500,
                    color:
                      order.status === 'Pending' ? '#92400e' :
                      order.status === 'Accepted' ? '#0369a1' :
                      order.status === 'Packed' ? '#6b21a8' :
                      order.status === 'Out For Delivery' ? '#3730a3' :
                      order.status === 'Delivered' ? '#166534' : '#991b1b'
                  }}>
                    {order.status === 'Pending' && '🟡 Order Placed: Waiting for shop confirmation.'}
                    {order.status === 'Accepted' && `🟢 Order Accepted: Your order has been accepted by ${order.storeName || order.sellerName}.`}
                    {order.status === 'Packed' && '📦 Packed: Your order has been packed.'}
                    {order.status === 'Out For Delivery' && '🚚 Out for Delivery: Delivery partner has picked up your order.'}
                    {order.status === 'Delivered' && '✅ Delivered: Order delivered successfully.'}
                    {order.status === 'Rejected' && `❌ Rejected: Unfortunately your order was rejected. Reason: ${order.rejectReason || 'Out of Stock'}`}
                    {order.status === 'Cancelled' && '❌ Cancelled: Your order has been cancelled.'}
                  </div>

                  {/* Order Products List */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      Items Ordered
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {order.items.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <strong style={{ color: 'var(--foreground)' }}>{item.name}</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>x{item.quantity}</span>
                            </div>
                          </div>
                          <span style={{ fontWeight: 600 }}>₹{Number(item.price) * Number(item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0' }}>📍 <strong>Delivery Address:</strong> {order.deliveryAddress}</p>
                      <p style={{ margin: 0 }}>💳 <strong>Payment Method:</strong> {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online UPI'}</p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal:</span>
                        <span>₹{order.subtotal}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Delivery & Platform:</span>
                        <span>₹{order.deliveryCharge + order.platformFee}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                        <strong style={{ color: 'var(--foreground)', fontSize: '1rem' }}>Total Amount:</strong>
                        <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>₹{order.grandTotal}</strong>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Realtime Toast Container */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 1000 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-md)',
            animation: 'slide-down 0.2s ease-out'
          }}>
            {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default function CustomerOrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>
        Loading live orders tracking...
      </div>
    }>
      <CustomerOrdersContent />
    </Suspense>
  );
}
