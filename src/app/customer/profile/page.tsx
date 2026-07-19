'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  phone?: string;
  location?: string;
}

interface OrderRecord {
  orderId: string;
  orderNumber: string;
  shopName: string;
  itemsCount: number;
  totalAmount: number;
  date: string;
  status: string;
  paymentMethod: string;
  items: any[];
  sellerId: string;
}

interface Address {
  id: string;
  type: 'Home' | 'Office' | 'Other';
  details: string;
}

interface PaymentMethod {
  id: string;
  type: 'UPI' | 'Card' | 'COD';
  name: string;
}

interface Review {
  id: string;
  productName: string;
  rating: number;
  comment: string;
}

export default function ProfileDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { addToCart, clearCart, cartCount } = useCart();
  const { theme, setTheme } = useTheme();

  // Active User State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab Selector
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'payments' | 'ai-history' | 'wishlist' | 'notifications' | 'reviews' | 'rewards' | 'settings'>('profile');

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([
    { id: '1', type: 'Home', details: '12, Neighborhood Link Rd, Near Main Crossing' },
    { id: '2', type: 'Office', details: 'Block B, Sector 4, Tech Park' }
  ]);
  const [newAddressDetails, setNewAddressDetails] = useState('');
  const [newAddressType, setNewAddressType] = useState<'Home' | 'Office' | 'Other'>('Home');

  // Payments State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'UPI', name: 'Google Pay (upi: user@okaxis)' },
    { id: '2', type: 'Card', name: 'Visa ending in 4242' },
    { id: '3', type: 'COD', name: 'Cash on Delivery' }
  ]);
  const [newUpi, setNewUpi] = useState('');

  // Orders State
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Wishlist State
  const [wishlist, setWishlist] = useState<any[]>([
    { id: '3928172901-p1', name: 'Fresh Organic Apples (1kg)', price: 160, shopId: '3928172901', shopName: 'Nexthood Corner Store', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60', category: 'Fruits & Vegetables' },
    { id: '3928172902-p1', name: 'Premium Chocolate Fudge Cake', price: 450, shopId: '3928172902', shopName: 'Nexthood Central Bakery', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60', category: 'Cakes' }
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: '1', text: '⚡ Your FlashFest order is out for delivery!', read: false },
    { id: '2', text: '🔥 Premium Chocolate Fudge Cake just got restocked at Nexthood Central Bakery!', read: false },
    { id: '3', text: '💡 Price drop alert: Full Cream Milk now ₹74 (was ₹80).', read: true }
  ]);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([
    { id: '1', productName: 'Premium Chocolate Fudge Cake', rating: 5, comment: 'Hands down the best cake in the neighborhood!' },
    { id: '2', productName: 'Fresh Organic Apples (1kg)', rating: 4, comment: 'Very crisp and sweet, though delivery took 20 mins.' }
  ]);

  // AI Shopping History Templates
  const aiHistoryPlans = [
    {
      title: 'Chicken Biryani Shopping',
      price: 314,
      date: 'July 18',
      items: [
        { id: '3928172901-p3', name: 'Full Cream Milk (1L)', price: 74, category: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60' },
        { id: '3928172901-p2', name: 'Fresh Local Farm Tomatoes (1kg)', price: 60, category: 'Fruits & Vegetables', image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60' },
        { id: '3928172903-p1', name: 'Nexthood Special Burger', price: 180, category: 'Mains', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60' }
      ],
      shop: { id: '3928172901', name: 'Nexthood Corner Store', category: 'Grocery' }
    },
    {
      title: 'Weekly Grocery Essentials',
      price: 284,
      date: 'July 15',
      items: [
        { id: '3928172901-p3', name: 'Full Cream Milk (1L)', price: 74, category: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60' },
        { id: '3928172901-p4', name: 'Farm Fresh Brown Eggs (Pack of 12)', price: 90, category: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=60' },
        { id: '3928172902-p3', name: 'Artisanal Sourdough Bread', price: 120, category: 'Bread', image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=60' }
      ],
      shop: { id: '3928172901', name: 'Nexthood Corner Store', category: 'Grocery' }
    }
  ];

  const fetchOrders = async (userId: string) => {
    try {
      const ordersRes = await fetch(`/api/orders?customerId=${userId}`);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const realOrders = data.orders || [];
        
        // Sort raw orders by created_at newest first
        realOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const formatted: OrderRecord[] = realOrders.map((o: any) => ({
          orderId: o.orderId,
          orderNumber: o.orderNumber,
          shopName: o.storeName || o.sellerName || 'Local Shop',
          itemsCount: o.items?.reduce((acc: number, i: any) => acc + i.quantity, 0) || 1,
          totalAmount: o.grandTotal || 0,
          date: new Date(o.created_at).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          status: o.status,
          paymentMethod: o.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (UPI)',
          items: o.items || [],
          sellerId: o.sellerId
        }));
        setOrders(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  // 1. Load active authenticated customer details and order history
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
          setUser({
            ...data.user,
            phone: '+91 98765 43210',
            location: 'Latitude: 12.9716, Longitude: 77.5946'
          });
          await fetchOrders(data.user.id);
        } else {
          router.push('/customer/auth');
          return;
        }
      } catch (err) {
        router.push('/customer/auth');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // WebSocket Live Sync for orders status change
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log('[DEBUG] Customer profile subscribed to WebSocket updates');
      const uniqueSellerIds = Array.from(new Set(orders.map(o => o.sellerId)));
      uniqueSellerIds.forEach(sellerId => {
        socket.send(JSON.stringify({ type: 'subscribe', shopId: sellerId }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stock_update' && data.updateType === 'order_status_change') {
          console.log('[DEBUG] Reloading profile orders via WS status update');
          fetchOrders(user.id);
        }
      } catch (e) {
        console.error('Error processing WS update:', e);
      }
    };

    return () => {
      socket.close();
    };
  }, [user, orders.length]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // 2. Saved Addresses Add/Delete Handler
  const handleAddAddress = () => {
    if (!newAddressDetails.trim()) return;
    const newAddr: Address = {
      id: String(Date.now()),
      type: newAddressType,
      details: newAddressDetails
    };
    setAddresses([...addresses, newAddr]);
    setNewAddressDetails('');
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
  };

  // 3. Payment Methods Add/Remove Handler
  const handleAddPayment = () => {
    if (!newUpi.trim()) return;
    const newPay: PaymentMethod = {
      id: String(Date.now()),
      type: 'UPI',
      name: `UPI (${newUpi})`
    };
    setPaymentMethods([...paymentMethods, newPay]);
    setNewUpi('');
  };

  const handleRemovePayment = (id: string) => {
    setPaymentMethods(paymentMethods.filter(pay => pay.id !== id));
  };

  // 4. One-Click AI Shopping list reuser
  const handleReuseAIPlan = (plan: typeof aiHistoryPlans[0]) => {
    clearCart();

    plan.items.forEach((item) => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        description: 'Reused from AI Shopping Plan',
        image: item.image,
        category: item.category
      }, {
        id: plan.shop.id,
        name: plan.shop.name,
        category: plan.shop.category,
        lat: 0,
        lon: 0
      });
    });

    router.push('/customer/checkout');
  };

  // 5. Wishlist actions
  const handleMoveWishlistToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      description: 'Added from Wishlist',
      image: item.image,
      category: item.category
    }, {
      id: item.shopId,
      name: item.shopName,
      category: item.category,
      lat: 0,
      lon: 0
    });
    // Remove from wishlist
    setWishlist(wishlist.filter(w => w.id !== item.id));
  };

  const handleRemoveWishlist = (id: string) => {
    setWishlist(wishlist.filter(w => w.id !== id));
  };

  // 6. Review deletion
  const handleDeleteReview = (id: string) => {
    setReviews(reviews.filter(r => r.id !== id));
  };

  // 7. Notification read
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
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
        Loading account details...
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Customer' }} onLogout={handleLogout} />

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Left Navigation Sidebar */}
          <aside className="card" style={{
            width: '280px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700
              }}>
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{user.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Dashboard</span>
              </div>
            </div>

            <button onClick={() => setActiveTab('profile')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'profile' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              👤 Profile Info
            </button>
            <button onClick={() => setActiveTab('orders')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'orders' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              📦 My Orders
            </button>
            <button onClick={() => setActiveTab('addresses')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'addresses' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'addresses' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              📍 Saved Addresses
            </button>
            <button onClick={() => setActiveTab('payments')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'payments' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'payments' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              💳 Payments
            </button>
            <button onClick={() => setActiveTab('ai-history')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'ai-history' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'ai-history' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              🤖 AI Shop History
            </button>
            <button onClick={() => setActiveTab('wishlist')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'wishlist' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'wishlist' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              💖 Wishlist
            </button>
            <button onClick={() => setActiveTab('notifications')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'notifications' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'notifications' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              🔔 Notifications
            </button>
            <button onClick={() => setActiveTab('reviews')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'reviews' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'reviews' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              ⭐ Reviews & Ratings
            </button>
            <button onClick={() => setActiveTab('rewards')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'rewards' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'rewards' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              🎁 Rewards
            </button>
            <button onClick={() => setActiveTab('settings')} style={{ textAlign: 'left', border: 'none', background: activeTab === 'settings' ? 'rgba(16,185,129,0.06)' : 'none', color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
              ⚙️ Settings
            </button>
          </aside>

          {/* Right Section: Tab Content Render */}
          <div style={{ flex: 1, minWidth: '320px' }}>
            
            {/* 1. Profile Info Tab */}
            {activeTab === 'profile' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                  Profile Information
                </h2>
                
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 800
                  }}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{user.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registered Nexthood Customer</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Email Address</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--foreground)' }}>{user.email}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Mobile Number</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--foreground)' }}>{user.phone}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Current GPS Location</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>{user.location}</strong>
                  </div>
                </div>

                <button className="btn btn-secondary" style={{ marginTop: '2.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                  Edit Profile Details
                </button>
              </div>
            )}

            {/* 2. My Orders Tab */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                    My Orders
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    Track details, download statements, or place re-orders instantly.
                  </p>
                </div>

                {orders.length === 0 ? (
                  <div className="card" style={{ backgroundColor: '#ffffff', padding: '3rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📦</span>
                    <h3>No orders placed yet</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Go to the customer home page to explore stores and place orders.</p>
                  </div>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.orderId} className="card" style={{ backgroundColor: '#ffffff', padding: '1.75rem', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{
                              backgroundColor:
                                ord.status === 'Pending' ? '#fef3c7' :
                                ord.status === 'Accepted' ? '#d1e7ff' :
                                ord.status === 'Packed' ? '#f3e8ff' :
                                ord.status === 'Out For Delivery' ? '#e0e7ff' :
                                ord.status === 'Delivered' ? '#d1fae5' : '#fee2e2',
                              color:
                                ord.status === 'Pending' ? '#b45309' :
                                ord.status === 'Accepted' ? '#0b5ed7' :
                                ord.status === 'Packed' ? '#7e22ce' :
                                ord.status === 'Out For Delivery' ? '#4338ca' :
                                ord.status === 'Delivered' ? '#047857' : '#b91c1c',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '4px'
                            }}>
                              {ord.status}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: <strong style={{ fontFamily: 'monospace' }}>{ord.orderNumber || ord.orderId}</strong></span>
                          </div>
                          
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>{ord.shopName}</h3>
                          
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span>Placed: <strong>{ord.date}</strong></span>
                            <span>•</span>
                            <span>Payment: <strong>{ord.paymentMethod}</strong></span>
                            <span>•</span>
                            <span>Total Paid: <strong style={{ color: 'var(--primary)' }}>₹{ord.totalAmount}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link href="/orders" className="btn btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.8rem', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-block' }}>
                            📍 Track Order
                          </Link>
                        </div>
                      </div>

                      {/* Products List Detail */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Items Ordered:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {ord.items.map((item: any) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span>🛒 {item.name} <strong style={{ color: 'var(--text-muted)' }}>x{item.quantity}</strong></span>
                              <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Saved Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Saved Addresses
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  {addresses.map((addr) => (
                    <div key={addr.id} style={{ padding: '1.25rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem' }}>{addr.type}</strong>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{addr.details}</p>
                      </div>
                      <button onClick={() => handleDeleteAddress(addr.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Add New Address</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <select
                        value={newAddressType}
                        onChange={(e: any) => setNewAddressType(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Enter full address details..."
                        className="form-input"
                        value={newAddressDetails}
                        onChange={(e) => setNewAddressDetails(e.target.value)}
                        style={{ flex: 1, border: '1px solid var(--border)' }}
                      />
                    </div>
                    <button onClick={handleAddAddress} className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}>
                      ➕ Add Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Payments Tab */}
            {activeTab === 'payments' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Payment Methods
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  {paymentMethods.map((pay) => (
                    <div key={pay.id} style={{ padding: '1.25rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem' }}>{pay.type}</strong>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{pay.name}</p>
                      </div>
                      {pay.type !== 'COD' && (
                        <button onClick={() => handleRemovePayment(pay.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Add New UPI ID</h3>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                      type="text"
                      placeholder="e.g. username@upi"
                      className="form-input"
                      value={newUpi}
                      onChange={(e) => setNewUpi(e.target.value)}
                      style={{ flex: 1, border: '1px solid var(--border)' }}
                    />
                    <button onClick={handleAddPayment} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}>
                      Add UPI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI Shop History Tab */}
            {activeTab === 'ai-history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                    AI Shopping History
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    One-click checkout of your previous LLM-optimized shopping lists.
                  </p>
                </div>

                {aiHistoryPlans.map((plan, idx) => (
                  <div key={idx} className="card" style={{ backgroundColor: '#ffffff', padding: '1.75rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>🤖 {plan.title}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                        Created on {plan.date} • Total Price: <strong>₹{plan.price}</strong>
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {plan.items.map((item, id) => (
                          <span key={id} style={{ fontSize: '0.75rem', backgroundColor: 'var(--secondary)', color: 'var(--foreground)', padding: '0.25rem 0.5rem', borderRadius: '3px' }}>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => handleReuseAIPlan(plan)} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}>
                      ⚡ Reuse Shopping List
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Wishlist & Saved Products
                </h2>

                {wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Your wishlist is empty.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {wishlist.map((item) => (
                      <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.95rem', display: 'block' }}>{item.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Store: {item.shopName}</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--foreground)', display: 'block', marginTop: '0.25rem' }}>₹{item.price}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleMoveWishlistToCart(item)} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                            Move to Cart
                          </button>
                          <button onClick={() => handleRemoveWishlist(item.id)} className="btn btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', color: '#ef4444' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Notifications & Alerts
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {notifications.map((n) => (
                    <div key={n.id} style={{
                      padding: '1rem 1.25rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: n.read ? '#ffffff' : 'rgba(16, 185, 129, 0.03)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: n.read ? 'var(--text-muted)' : 'var(--foreground)', fontWeight: n.read ? 400 : 500 }}>
                        {n.text}
                      </span>
                      {!n.read && (
                        <button onClick={() => handleMarkNotificationRead(n.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Reviews & Ratings Given
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reviews.map((r) => (
                    <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{r.productName}</strong>
                        <span style={{ color: '#eab308' }}>{'★'.repeat(r.rating)}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>"{r.comment}"</p>
                      <button onClick={() => handleDeleteReview(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem', padding: 0 }}>
                        Delete Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Rewards Tab */}
            {activeTab === 'rewards' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                  My Rewards & Cashback
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Reward Points</span>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>350 pts</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'block' }}>Cashback Earned</span>
                    <strong style={{ fontSize: '1.5rem', color: '#065f46' }}>₹120</strong>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Points Progress Bar</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>Level 2 Customer</span>
                    <span>350 / 500 Points</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '2.5rem' }}>
                    <div style={{ width: '70%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Available Coupons</h3>
                  <div style={{ padding: '1rem', border: '1px dashed var(--primary)', backgroundColor: 'rgba(16,185,129,0.02)', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>NEIGHBOR10</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Get flat 10% off on bakery products.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 10. Settings Tab */}
            {activeTab === 'settings' && (
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                  Account Settings
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--foreground)' }}>Display Appearance</strong>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block' }}>Notification Preferences</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive order status updates via SMS.</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>Enabled</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                    <button onClick={handleLogout} className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                      Logout Account
                    </button>
                    <button className="btn btn-secondary" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>
    </>
  );
}
