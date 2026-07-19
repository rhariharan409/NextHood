'use client';

import { useEffect, useState, useMemo } from 'react';
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
  rejectReason?: string;
}

interface ProductRecord {
  id: string;
  name: string;
  brand: string;
  price: string;
  stock: string;
  min_stock_alert: string;
}

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.2; // default fallback
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(1));
}

// Estimated delivery time calculator
function getExpectedDeliveryTime(distKm: number): string {
  if (distKm <= 1.5) return '15 mins';
  if (distKm <= 3) return '25 mins';
  if (distKm <= 5) return '35 mins';
  return '45 mins';
}

// Clean browser-synth notification beep
function playNotificationSound(type: 'new' | 'cancel' | 'alert') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'new') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'cancel') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, audioCtx.currentTime); // E4
      osc.frequency.setValueAtTime(220, audioCtx.currentTime + 0.15); // A3
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn('Audio Context not allowed or failed:', e);
  }
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [shopCoords, setShopCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Latest');

  // Selected orders for Bulk Export
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, boolean>>({});

  // Reject Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReasonType, setRejectReasonType] = useState('Out of Stock');
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Selected Order Drawer State
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'info' | 'error' | 'success' | 'warning' }[]>([]);

  const addToast = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load seller auth and resources
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
        await Promise.all([
          loadOrders(data.user.id),
          loadProducts(),
          loadShopCoords(data.user.id)
        ]);
      } else {
        router.push('/seller/auth');
      }
    } catch (err) {
      router.push('/seller/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadShopCoords = async (sellerId: string) => {
    try {
      const shopRes = await fetch(`/api/places/details?id=${sellerId}`);
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        if (shopData.business) {
          setShopCoords({
            lat: Number(shopData.business.lat),
            lon: Number(shopData.business.lon)
          });
        }
      }
    } catch (e) {
      console.error('Failed to load shop coordinates:', e);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/seller/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        
        // Low Stock alert check
        const lowStockItems = (data.products || []).filter(
          (p: any) => (parseInt(p.stock) || 0) <= (parseInt(p.min_stock_alert) || 5)
        );
        if (lowStockItems.length > 0) {
          addToast(`⚠️ Low Stock Alert: ${lowStockItems.length} products are running low!`, 'warning');
          playNotificationSound('alert');
        }
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadOrders = async (sellerId: string) => {
    try {
      const res = await fetch(`/api/orders?shopId=${sellerId}`);
      if (res.ok) {
        const data = await res.json();
        const sellerOrders: OrderRecord[] = data.orders || [];
        setOrders(sellerOrders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // WebSocket instant notifications & live sync
  useEffect(() => {
    if (!user) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connectWs() {
      ws = new WebSocket('ws://localhost:3001');

      ws.onopen = () => {
        console.log('[DEBUG] Connected to WebSocket from Seller Orders Dashboard');
        ws?.send(JSON.stringify({ type: 'subscribe', shopId: user?.id }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DEBUG] Seller received WS payload:', data);
          
          if (data.type === 'stock_update') {
            if (data.updateType === 'new_order') {
              addToast('🔔 New Order Received!', 'success');
              playNotificationSound('new');
              if (user) loadOrders(user.id);
            } else if (data.updateType === 'release') {
              addToast(`🔔 Order Cancelled / Released!`, 'error');
              playNotificationSound('cancel');
              if (user) {
                loadOrders(user.id);
                loadProducts();
              }
            } else if (data.updateType === 'online_payment_confirmed') {
              addToast(`🔔 Payment Received for Order!`, 'success');
              playNotificationSound('new');
              if (user) loadOrders(user.id);
            }
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[DEBUG] WS connection closed, reconnecting...');
        reconnectTimeout = setTimeout(connectWs, 5000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
        ws?.close();
      };
    }

    connectWs();

    // Regular polling fallback every 6 seconds as a backup
    const fallbackInterval = setInterval(() => {
      loadOrders(user.id);
      loadProducts();
    }, 6000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(fallbackInterval);
    };
  }, [user]);

  // Order Status transition advanced handler
  const handleStatusChange = async (orderId: string, newStatus: string, rejectReason?: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, rejectReason })
      });
      if (res.ok) {
        addToast(`Order status updated to ${newStatus}`, 'success');
        if (user) {
          await loadOrders(user.id);
          await loadProducts();
        }

        // Broadcast change via WS
        const socket = new WebSocket('ws://localhost:3001');
        socket.onopen = () => {
          socket.send(JSON.stringify({
            type: 'broadcast_update',
            shopId: user?.id,
            productId: 'STATUS_SYNC',
            stock: 0,
            updateType: 'order_status_change',
            change: 0
          }));
          setTimeout(() => socket.close(), 500);
        };
      } else {
        addToast('Failed to update order status. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      addToast('Network error while updating status.', 'error');
    } finally {
      setUpdatingOrderId(null);
      // Update selected drawer order details if open
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus, rejectReason: rejectReason || prev.rejectReason } : null);
      }
    }
  };

  const handleOpenRejectModal = (orderId: string) => {
    setRejectOrderId(orderId);
    setRejectReasonType('Out of Stock');
    setCustomRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!rejectOrderId) return;
    const finalReason = rejectReasonType === 'Other' ? customRejectReason : rejectReasonType;
    handleStatusChange(rejectOrderId, 'Rejected', finalReason);
    setShowRejectModal(false);
    setRejectOrderId(null);
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

  // Helper dictionary to map product ids to current stock
  const productStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      map[p.id] = parseInt(p.stock) || 0;
    });
    return map;
  }, [products]);

  // Statistics calculation dynamically
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'Pending').length;
    const accepted = orders.filter(o => o.status === 'Accepted').length;
    const rejected = orders.filter(o => o.status === 'Rejected').length;
    const outForDelivery = orders.filter(o => o.status === 'Out For Delivery').length;

    const todayStr = new Date().toDateString();
    const deliveredToday = orders.filter(
      o => o.status === 'Delivered' && new Date(o.created_at).toDateString() === todayStr
    ).length;

    const totalRevenue = orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    return { total, pending, accepted, rejected, outForDelivery, deliveredToday, totalRevenue };
  }, [orders]);

  // Analytics logic
  const analytics = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'Delivered');
    
    // Revenue calculations
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const todayRevenue = delivered
      .filter(o => (now.getTime() - new Date(o.created_at).getTime()) < oneDay)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const weeklyRevenue = delivered
      .filter(o => (now.getTime() - new Date(o.created_at).getTime()) < (7 * oneDay))
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const monthlyRevenue = delivered
      .filter(o => (now.getTime() - new Date(o.created_at).getTime()) < (30 * oneDay))
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const averageOrderValue = delivered.length > 0
      ? parseFloat((delivered.reduce((sum, o) => sum + o.grandTotal, 0) / delivered.length).toFixed(1))
      : 0;

    // Find best selling products
    const productQuantities: Record<string, { name: string; qty: number; revenue: number }> = {};
    delivered.forEach(order => {
      order.items.forEach(item => {
        if (!productQuantities[item.id]) {
          productQuantities[item.id] = { name: item.name, qty: 0, revenue: 0 };
        }
        productQuantities[item.id].qty += item.quantity || 1;
        productQuantities[item.id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    let bestSelling = 'None';
    let highestQty = 0;
    let topRevenueProd = 'None';
    let highestRevenueVal = 0;

    Object.values(productQuantities).forEach(p => {
      if (p.qty > highestQty) {
        highestQty = p.qty;
        bestSelling = p.name;
      }
      if (p.revenue > highestRevenueVal) {
        highestRevenueVal = p.revenue;
        topRevenueProd = p.name;
      }
    });

    return {
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      averageOrderValue,
      bestSellingProduct: bestSelling,
      highestRevenueProduct: topRevenueProd
    };
  }, [orders]);

  // Filtering, Searching, and Sorting Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        o.orderNumber.toLowerCase().includes(q) ||
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some(item => item.name.toLowerCase().includes(q))
      );
    }

    // Filter check
    if (selectedFilter !== 'All') {
      result = result.filter(o => o.status.toLowerCase() === selectedFilter.toLowerCase());
    }

    // Sort check
    if (selectedSort === 'Latest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (selectedSort === 'Oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (selectedSort === 'Highest Amount') {
      result.sort((a, b) => b.grandTotal - a.grandTotal);
    } else if (selectedSort === 'Lowest Amount') {
      result.sort((a, b) => a.grandTotal - b.grandTotal);
    }

    return result;
  }, [orders, searchQuery, selectedFilter, selectedSort]);

  // Bulk Export Functions
  const handleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getExportData = () => {
    const list = filteredOrders.filter(o => selectedOrderIds[o.orderId]);
    return list.length > 0 ? list : filteredOrders;
  };

  const exportCSV = () => {
    const data = getExportData();
    let csvContent = 'data:text/csv;charset=utf-8,Order ID,Customer Name,Date,Payment Method,Status,Grand Total\n';
    data.forEach(o => {
      csvContent += `${o.orderNumber},"${o.customerName}",${new Date(o.created_at).toLocaleString()},${o.paymentMethod},${o.status},₹${o.grandTotal}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NextHood_Orders_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    const data = getExportData();
    let tsvContent = 'Order ID\tCustomer Name\tDate\tPayment Method\tStatus\tGrand Total\tSubtotal\tDelivery Charge\tAddress\n';
    data.forEach(o => {
      tsvContent += `${o.orderNumber}\t${o.customerName}\t${new Date(o.created_at).toLocaleString()}\t${o.paymentMethod}\t${o.status}\t₹${o.grandTotal}\t₹${o.subtotal}\t₹${o.deliveryCharge}\t${o.deliveryAddress}\n`;
    });
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NextHood_Orders_Export_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)', color: 'var(--text-muted)' }}>
        Loading merchant orders dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Seller' }} onLogout={handleLogout} />
      
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '2rem 1.5rem', fontFamily: 'var(--font-family)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }} className="no-print">
            <Link href="/seller/home" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)'
            }}>
              🏠 Dashboard Home
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
              📋 My Orders
            </Link>
          </div>

          {/* Page Title & Export Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>
                Merchant Center
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foreground)', marginTop: '0.25rem' }}>
                Seller Dashboard
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={exportCSV} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                📥 CSV
              </button>
              <button onClick={exportExcel} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                📊 Excel
              </button>
              <button onClick={exportPDF} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                📄 PDF / Print
              </button>
            </div>
          </div>

          {/* Dynamic Statistics Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>📦</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Orders</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: 'var(--foreground)' }}>{stats.total}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>🟡</span>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pending</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: '#f59e0b' }}>{stats.pending}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>🟢</span>
              <span style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Accepted</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: '#3b82f6' }}>{stats.accepted}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>🔴</span>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Rejected</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: '#ef4444' }}>{stats.rejected}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>🚚</span>
              <span style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Out For Delivery</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: '#6366f1' }}>{stats.outForDelivery}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>✅</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Delivered Today</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: 'var(--primary)' }}>{stats.deliveredToday}</strong>
            </div>
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>💰</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Revenue</span>
              <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: '0.25rem', color: 'var(--primary)' }}>₹{stats.totalRevenue.toFixed(0)}</strong>
            </div>
          </div>

          {/* Revenue Analytics Details */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }} className="no-print">
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Today's Revenue</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--foreground)' }}>₹{analytics.todayRevenue.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Weekly Revenue</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--foreground)' }}>₹{analytics.weeklyRevenue.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Monthly Revenue</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--foreground)' }}>₹{analytics.monthlyRevenue.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Average Order Value</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--foreground)' }}>₹{analytics.averageOrderValue.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Best Selling Product</span>
              <strong style={{ fontSize: '1rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{analytics.bestSellingProduct}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Highest Revenue Product</span>
              <strong style={{ fontSize: '1rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{analytics.highestRevenueProduct}</strong>
            </div>
          </div>

          {/* Search, Filter, Sort Controls */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }} className="no-print">
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by Order ID, Customer Name, or Product Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'var(--transition)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['All', 'Pending', 'Accepted', 'Packed', 'Out For Delivery', 'Delivered', 'Cancelled', 'Rejected'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid ' + (selectedFilter === filter ? 'var(--primary)' : 'var(--border)'),
                    backgroundColor: selectedFilter === filter ? 'var(--primary)' : '#ffffff',
                    color: selectedFilter === filter ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Latest">Latest Orders</option>
                <option value="Oldest">Oldest Orders</option>
                <option value="Highest Amount">Highest Amount</option>
                <option value="Lowest Amount">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Orders Cards Listing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '4rem 2rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>📦</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem' }}>No Orders Yet</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Orders placed by customers will appear here automatically.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const date = new Date(order.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
                
                // Calculate distance using coordinates
                const distanceVal = calculateDistance(
                  shopCoords?.lat || 0,
                  shopCoords?.lon || 0,
                  order.latitude,
                  order.longitude
                );
                
                const isSelected = !!selectedOrderIds[order.orderId];
                
                return (
                  <div key={order.orderId} style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-sm)',
                    overflow: 'hidden',
                    transition: 'var(--transition)'
                  }}>
                    {/* Header Row */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOrder(order.orderId)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          className="no-print"
                        />
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Order ID</span>
                          <strong onClick={() => setSelectedOrder(order)} style={{ fontSize: '0.95rem', color: 'var(--primary)', fontFamily: 'monospace', cursor: 'pointer' }}>
                            {order.orderNumber || order.orderId}
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Order Placed</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: 500 }}>
                          {date}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Payment Method</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: 600 }}>
                          {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment (UPI)'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Amount</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>₹{order.grandTotal}</strong>
                      </div>
                      <div>
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
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          display: 'inline-block'
                        }}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }} className="responsive-body">
                      {/* Products List & Card Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Items Ordered</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {order.items.map((item) => {
                              const remainingStock = productStockMap[item.id] !== undefined ? productStockMap[item.id] : 25;
                              return (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                  {item.image ? (
                                    <img src={item.image} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                  ) : (
                                    <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', borderRadius: '8px', fontSize: '1.25rem' }}>📦</div>
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <strong style={{ fontSize: '0.9rem', color: 'var(--foreground)', display: 'block' }}>{item.name}</strong>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {item.brand && `Brand: ${item.brand} • `}Qty: {item.quantity} • Price: ₹{item.price}
                                    </span>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: remainingStock === 0 ? '#ef4444' : remainingStock <= 5 ? '#f59e0b' : 'var(--text-muted)',
                                      display: 'block'
                                    }}>
                                      Remaining Stock: {remainingStock === 0 ? '❌ Out of Stock' : remainingStock}
                                    </span>
                                    <strong style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>₹{(item.price * item.quantity).toFixed(2)}</strong>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Seller Actions Buttons */}
                        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }} className="no-print">
                          {order.status === 'Pending' ? (
                            <>
                              <button
                                disabled={updatingOrderId === order.orderId}
                                onClick={() => handleStatusChange(order.orderId, 'Accepted')}
                                style={{
                                  flex: 1,
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'var(--transition)'
                                }}
                              >
                                🟢 Accept Order
                              </button>
                              <button
                                disabled={updatingOrderId === order.orderId}
                                onClick={() => handleOpenRejectModal(order.orderId)}
                                style={{
                                  flex: 1,
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'var(--transition)'
                                }}
                              >
                                🔴 Reject Order
                              </button>
                            </>
                          ) : (
                            <div style={{ width: '100%' }}>
                              {order.status === 'Rejected' ? (
                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  ❌ Order Rejected {order.rejectReason && `(${order.rejectReason})`}
                                </div>
                              ) : order.status === 'Cancelled' ? (
                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.95rem' }}>
                                  ❌ Order Cancelled
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                  <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                                    ✅ Order Accepted
                                  </div>
                                  
                                  {/* Timeline / Progress advancer */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status Timeline:</span>
                                    {order.status === 'Accepted' && (
                                      <button onClick={() => handleStatusChange(order.orderId, 'Packed')} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', backgroundColor: '#7e22ce', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                        📦 Mark as Packed
                                      </button>
                                    )}
                                    {order.status === 'Packed' && (
                                      <button onClick={() => handleStatusChange(order.orderId, 'Out For Delivery')} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', backgroundColor: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                        🚚 Mark as Out For Delivery
                                      </button>
                                    )}
                                    {order.status === 'Out For Delivery' && (
                                      <button onClick={() => handleStatusChange(order.orderId, 'Delivered')} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                        ✅ Mark as Delivered
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Summary Detail Card */}
                      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="responsive-detail">
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Customer & Delivery</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span>👤 <strong>Name:</strong> {order.customerName}</span>
                            <span>📞 <strong>Phone:</strong> XXXXXXXXXX</span>
                            <span style={{ display: 'flex', gap: '0.25rem' }}>
                              📍 <strong>Address:</strong>
                              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.4', flex: 1 }}>{order.deliveryAddress}</p>
                            </span>
                            <span>🚚 <strong>Distance:</strong> {distanceVal} km</span>
                            <span>⏱️ <strong>Expected Delivery:</strong> {getExpectedDeliveryTime(distanceVal)}</span>
                          </div>
                        </div>

                        {/* Order Timeline Visuals */}
                        {order.status !== 'Rejected' && order.status !== 'Cancelled' && (
                          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Progress:</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: '10px', left: '0', right: '0', height: '3px', backgroundColor: '#e2e8f0', zIndex: 1 }}></div>
                              {/* Colored Progress bar */}
                              <div style={{
                                position: 'absolute',
                                top: '10px',
                                left: '0',
                                width:
                                  order.status === 'Pending' ? '0%' :
                                  order.status === 'Accepted' ? '25%' :
                                  order.status === 'Packed' ? '50%' :
                                  order.status === 'Out For Delivery' ? '75%' : '100%',
                                height: '3px',
                                backgroundColor: 'var(--primary)',
                                zIndex: 1
                              }}></div>
                              
                              {['Pending', 'Accepted', 'Packed', 'Out For Delivery', 'Delivered'].map((step, idx) => {
                                const stepOrder = ['Pending', 'Accepted', 'Packed', 'Out For Delivery', 'Delivered'];
                                const activeIdx = stepOrder.indexOf(order.status);
                                const isDone = idx <= activeIdx;
                                
                                return (
                                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative' }}>
                                    <div style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      backgroundColor: isDone ? 'var(--primary)' : '#ffffff',
                                      border: '3px solid ' + (isDone ? 'var(--primary)' : '#cbd5e1'),
                                      boxShadow: 'var(--shadow-sm)'
                                    }}></div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: isDone ? 'var(--foreground)' : 'var(--text-muted)', marginTop: '0.25rem', transform: 'scale(0.95)' }}>
                                      {step === 'Out For Delivery' ? 'Transit' : step}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rejection Modal Popup */}
          {showRejectModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} className="no-print">
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '460px', padding: '2rem', boxShadow: 'var(--shadow-lg)', animation: 'fade-in 0.2s ease-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>Reason for Rejection</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Choose Rejection Reason</label>
                    <select
                      value={rejectReasonType}
                      onChange={(e) => setRejectReasonType(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none' }}
                    >
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Store Closed">Store Closed</option>
                      <option value="Product Damaged">Product Damaged</option>
                      <option value="Unable to Deliver">Unable to Deliver</option>
                      <option value="Other">Other (Custom Reason)</option>
                    </select>
                  </div>

                  {rejectReasonType === 'Other' && (
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Specify Reason</label>
                      <input
                        type="text"
                        placeholder="Type customer-facing reject reason..."
                        value={customRejectReason}
                        onChange={(e) => setCustomRejectReason(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowRejectModal(false)} style={{ flex: 1, padding: '0.7rem', backgroundColor: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleConfirmReject} style={{ flex: 1, padding: '0.7rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Confirm Reject</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right-Side Order Detail Drawer */}
          {selectedOrder && (
            <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelectedOrder(null)}>
              <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '560px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', animation: 'slide-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={(e) => e.stopPropagation()}>
                {/* Drawer Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Order Invoice Summary</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)' }}>
                      {selectedOrder.orderNumber}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>

                {/* Drawer Contents */}
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Status Timeline */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>Order status timeline</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2.5px solid var(--border)', paddingLeft: '1.25rem', marginLeft: '0.5rem' }}>
                      {[
                        { status: 'Pending', label: 'Order Placed (Pending Review)', desc: 'Order received from customer checkout.' },
                        { status: 'Accepted', label: 'Order Accepted', desc: 'Shop verified stock inventory and accepted dispatch.' },
                        { status: 'Packed', label: 'Items Packed', desc: 'Items safely packed and ready for carrier pickup.' },
                        { status: 'Out For Delivery', label: 'Out For Delivery', desc: 'Delivery partner has departed store premises.' },
                        { status: 'Delivered', label: 'Delivered successfully', desc: 'Order reached customer location.' },
                        { status: 'Rejected', label: 'Order Rejected', desc: `Reason: ${selectedOrder.rejectReason || 'Store policy'}` }
                      ].filter(step => {
                        if (selectedOrder.status === 'Rejected' && step.status === 'Rejected') return true;
                        if (selectedOrder.status === 'Cancelled' && step.status === 'Rejected') return false;
                        if (step.status === 'Rejected') return false;
                        return true;
                      }).map((step, idx) => {
                        const stepOrder = ['Pending', 'Accepted', 'Packed', 'Out For Delivery', 'Delivered'];
                        const activeIdx = stepOrder.indexOf(selectedOrder.status);
                        const isDone = selectedOrder.status === step.status || (activeIdx >= 0 && stepOrder.indexOf(step.status) <= activeIdx && selectedOrder.status !== 'Rejected' && selectedOrder.status !== 'Cancelled');
                        
                        return (
                          <div key={step.status} style={{ position: 'relative' }}>
                            {/* Marker dot */}
                            <div style={{
                              position: 'absolute',
                              left: '-26px',
                              top: '2px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: isDone ? 'var(--primary)' : '#ffffff',
                              border: '2px solid ' + (isDone ? 'var(--primary)' : '#cbd5e1'),
                              boxShadow: 'var(--shadow-sm)'
                            }}></div>
                            <strong style={{ fontSize: '0.85rem', display: 'block', color: isDone ? 'var(--foreground)' : 'var(--text-muted)' }}>{step.label}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{step.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>Customer Profile & Address</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span>👤 <strong>Name:</strong> {selectedOrder.customerName}</span>
                      <span>📧 <strong>Email:</strong> {selectedOrder.customerId.substring(0, 8)}@nexthood-buyer.com</span>
                      <span>📞 <strong>Phone:</strong> +91 XXXXX XXXXX</span>
                      <span>📍 <strong>Address:</strong> {selectedOrder.deliveryAddress}</span>
                      <span>🛰️ <strong>Coordinates:</strong> {selectedOrder.latitude.toFixed(6)}, {selectedOrder.longitude.toFixed(6)}</span>
                      
                      <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <span>Customer since: 2026</span>
                        <span>Orders count: 4 placed</span>
                      </div>
                    </div>
                  </div>

                  {/* Products Details Invoice */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>Invoice Items</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.5rem 0' }}>Item Name</th>
                          <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 0' }}>{item.name}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>₹{item.price}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', borderTop: '1.5px solid var(--border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Delivery Fees:</span>
                      <span>₹{selectedOrder.deliveryCharge.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Platform Charge:</span>
                      <span>₹{selectedOrder.platformFee.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>GST Tax (5%):</span>
                      <span>₹{selectedOrder.tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem', fontSize: '1rem', fontWeight: 700 }}>
                      <span>Total Amount Paid:</span>
                      <span style={{ color: 'var(--primary)' }}>₹{selectedOrder.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Print & Download Invoice Controls */}
                  <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }} className="no-print">
                    <button onClick={() => window.print()} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#ffffff', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      🖨️ Print Invoice
                    </button>
                    <button onClick={() => {
                      const data = JSON.stringify(selectedOrder, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', `Invoice_${selectedOrder.orderNumber}.json`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', backgroundColor: 'var(--primary)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      📥 Download Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification Container */}
          <div style={{ position: 'fixed', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10000 }} className="no-print">
            {toasts.map(toast => (
              <div key={toast.id} style={{
                backgroundColor:
                  toast.type === 'success' ? '#d1fae5' :
                  toast.type === 'error' ? '#fee2e2' :
                  toast.type === 'warning' ? '#fef3c7' : '#f1f5f9',
                color:
                  toast.type === 'success' ? '#065f46' :
                  toast.type === 'error' ? '#991b1b' :
                  toast.type === 'warning' ? '#92400e' : '#334155',
                border: '1.5px solid ' + (
                  toast.type === 'success' ? '#10b981' :
                  toast.type === 'error' ? '#ef4444' :
                  toast.type === 'warning' ? '#f59e0b' : '#cbd5e1'
                ),
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animation: 'slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <span>{toast.message}</span>
              </div>
            ))}
          </div>

        </div>
      </main>

      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .responsive-body {
            grid-template-columns: 1fr !important;
          }
          .responsive-detail {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid #e2e8f0;
            padding-top: 1.5rem;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
          }
        }
      `}</style>
    </>
  );
}
