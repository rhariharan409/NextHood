'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart, CartItem } from '@/context/CartContext';
import { getDistance } from '@/lib/overpass';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShieldCheck, CreditCard, ShoppingBag, Truck, Gift, CheckCircle, Clock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, shop, updateQuantity, removeFromCart, clearCart } = useCart();

  // Authentication & GPS
  const [user, setUser] = useState<User | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Delivery Calculations
  const [distance, setDistance] = useState<number>(1.2); // Default 1.2km
  const [deliveryTime, setDeliveryTime] = useState<string>('10-15 mins');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(30);
  const [deliveryAddress, setDeliveryAddress] = useState('No.24 Gandhi Street, Tambaram, Chennai');

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Concurrency & Reservation states
  const [reservedItems, setReservedItems] = useState<Record<string, number>>({});
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservingStock, setReservingStock] = useState(true);

  // Order Placement state
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState('');
  const [confirmedDeliveryTime, setConfirmedDeliveryTime] = useState('');
  const [logisticsPlan, setLogisticsPlan] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Connect to WebSocket server for broadcasting changes
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    setWs(socket);
    return () => {
      socket.close();
    };
  }, []);

  // 1. Authenticate user and get user's live GPS coordinates
  useEffect(() => {
    async function initCheckout() {
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
            (position) => {
              setUserCoords({
                lat: position.coords.latitude,
                lon: position.coords.longitude
              });
            },
            (err) => console.log('Geolocation not available for distance:', err)
          );
        }
      } catch (err) {
        console.error('Checkout initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    initCheckout();
  }, [router]);

  // Helper to release all currently reserved items
  const releaseReservations = async (itemsToRelease: Record<string, number>) => {
    if (!shop) return;
    for (const [prodId, qty] of Object.entries(itemsToRelease)) {
      try {
        const response = await fetch('/api/inventory/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId: shop.id,
            productId: prodId,
            quantity: qty
          })
        });

        if (response.ok) {
          const resData = await response.json();
          // Broadcast release to WS
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'broadcast_update',
              shopId: shop.id,
              productId: prodId,
              stock: resData.stock,
              updateType: 'release',
              change: qty
            }));
          }
        }
      } catch (e) {
        console.error('Error releasing stock:', e);
      }
    }
  };

  // 2. Reserve stock immediately when checkout page loads
  useEffect(() => {
    async function runReservations() {
      if (cartItems.length === 0 || !shop || !user) return;
      setReservingStock(true);
      setReservationError(null);

      const newlyReserved: Record<string, number> = {};
      let failureMessage = null;

      for (const item of cartItems) {
        try {
          const response = await fetch('/api/inventory/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopId: shop.id,
              productId: item.product.id,
              quantity: item.quantity
            })
          });

          const resData = await response.json();

          if (response.ok && resData.success) {
            newlyReserved[item.product.id] = item.quantity;
            
            // Broadcast reserve update to other clients via WS
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'broadcast_update',
                shopId: shop.id,
                productId: item.product.id,
                stock: resData.stock,
                updateType: 'reserve',
                change: -item.quantity
              }));
            }
          } else {
            failureMessage = `Sorry, "${item.product.name}" just sold out! Please return to the shop.`;
            break;
          }
        } catch (err) {
          failureMessage = 'Network error during stock reservation. Please try again.';
          break;
        }
      }

      if (failureMessage) {
        // Release any successful reservations made before failure
        await releaseReservations(newlyReserved);
        setReservationError(failureMessage);
      } else {
        setReservedItems(newlyReserved);
      }
      setReservingStock(false);
    }

    if (user && cartItems.length > 0 && ws) {
      runReservations();
    }
  }, [user, cartItems, shop, ws]);

  // Release reservations on component unmount (if order was not confirmed)
  useEffect(() => {
    return () => {
      if (Object.keys(reservedItems).length > 0 && !orderConfirmed) {
        releaseReservations(reservedItems);
      }
    };
  }, [reservedItems, orderConfirmed, shop, ws]);

  // 3. Calculate Distance and Delivery estimates when coordinates are ready
  useEffect(() => {
    if (shop && userCoords && shop.lat && shop.lon) {
      const distMeters = getDistance(userCoords.lat, userCoords.lon, shop.lat, shop.lon);
      const distKm = parseFloat((distMeters / 1000).toFixed(1));
      setDistance(distKm || 0.5);

      if (distKm <= 2) {
        setDeliveryTime('10-15 mins');
        setDeliveryCharge(30);
      } else if (distKm <= 5) {
        setDeliveryTime('20-30 mins');
        setDeliveryCharge(45);
      } else if (distKm <= 8) {
        setDeliveryTime('35-45 mins');
        setDeliveryCharge(60);
      } else {
        setDeliveryTime('50-60 mins');
        setDeliveryCharge(80);
      }
    }
  }, [shop, userCoords]);

  // Math totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price || 0) * Number(item.quantity || 1),
    0
  );
  const platformFee = 5;
  const taxes = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal > 0 ? subtotal + Number(deliveryCharge || 0) + platformFee + taxes : 0;

  // Simulate online payment verification
  const handleSimulatePayment = () => {
    setConfirmingPayment(true);
    setTimeout(() => {
      setPaymentConfirmed(true);
      setConfirmingPayment(false);
    }, 2000);
  };

  // Simulate payment failure
  const handleSimulatePaymentFailure = async () => {
    setConfirmingPayment(true);
    setTimeout(async () => {
      setConfirmingPayment(false);
      setPaymentConfirmed(false);
      setReservationError('Online Payment Failed. Staged stock has been released back to shop.');
      await releaseReservations(reservedItems);
      setReservedItems({});
    }, 1500);
  };

  // 4. Place Order & Route Logistics
  const handlePlaceOrder = async () => {
    if (!user || cartItems.length === 0 || !shop) return;
    if (paymentMethod === 'online' && !paymentConfirmed) return;

    try {
      const itemsJson = cartItems.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          customerName: user.name,
          sellerId: shop.id,
          sellerName: shop.name,
          storeName: shop.name,
          items: itemsJson,
          subtotal,
          deliveryCharge,
          platformFee,
          tax: taxes,
          grandTotal,
          paymentMethod,
          deliveryAddress,
          latitude: userCoords?.lat || 12.9716,
          longitude: userCoords?.lon || 77.5946
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        
        // Notify seller via WebSocket to sync dashboard stats
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'broadcast_update',
            shopId: shop.id,
            productId: 'STATUS_SYNC',
            updateType: 'order_status_change'
          }));
        }

        setConfirmedOrderId(orderData.order.orderNumber || orderData.order.id);
        setConfirmedDeliveryTime(deliveryTime);
        setLogisticsPlan(orderData.logistics);
        setOrderConfirmed(true);
        clearCart();
      } else {
        alert('Order placement failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackLink = () => {
    if (shop) {
      router.push(`/customer/shop/${shop.id}`);
    } else {
      router.push('/customer/home');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <Header />
        <div className="container" style={{ maxWidth: '1100px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="shimmer skeleton-title" style={{ height: '40px', width: '50%' }}></div>
          <div className="shimmer skeleton-image" style={{ height: '300px' }}></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (orderConfirmed) {
    return (
      <>
        <Header currentUser={{ name: user.name, role: 'Customer' }} />
        <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '4rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(16,185,129,0.15)', backgroundColor: '#ffffff' }}
          >
            <CheckCircle size={56} color="var(--primary)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              Order Confirmed!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Your order has been routed and dispatches are staging.
            </p>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Order Reference:</span>
                <strong style={{ fontFamily: 'monospace' }}>{confirmedOrderId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Delivery:</span>
                <strong style={{ color: 'var(--primary)' }}>{confirmedDeliveryTime}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Sourced:</span>
                <strong>₹{grandTotal}</strong>
              </div>
              {logisticsPlan && (
                <div style={{ borderTop: '1px solid rgba(226,232,240,0.6)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  📍 <strong>Dispatch Route:</strong> Sourced from shop at coord [{logisticsPlan.shopCoords?.lat.toFixed(4)}, {logisticsPlan.shopCoords?.lon.toFixed(4)}] to destination coord [{logisticsPlan.customerCoords?.lat.toFixed(4)}, {logisticsPlan.customerCoords?.lon.toFixed(4)}] (Approx. {logisticsPlan.distanceKm} km).
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/orders" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem 0', textDecoration: 'none', borderRadius: '12px' }}>
                📍 Track Order Live
              </Link>
              <Link href="/customer/home" className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem 0', textDecoration: 'none', borderRadius: '12px' }}>
                Return Home
              </Link>
            </div>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Customer' }} />

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 1.5rem', fontFamily: 'var(--font-family)' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button
              onClick={handleBackLink}
              style={{
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              ← Return to shop
            </button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
              Secure Checkout
            </h1>
          </div>

          <AnimatePresence>
            {reservingStock && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: '16px',
                  padding: '1rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}
              >
                ⚡ Tatkal Allocations: Securing stock slots in real-time...
              </motion.div>
            )}
          </AnimatePresence>

          {reservationError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              padding: '1.5rem',
              borderRadius: '20px',
              color: '#ef4444',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{reservationError}</span>
              <button
                onClick={handleBackLink}
                className="btn btn-primary"
                style={{ width: '200px', fontSize: '0.8rem', padding: '0.5rem 0', borderRadius: '8px' }}
              >
                Go Back to Shop
              </button>
            </div>
          )}

          {!reservingStock && !reservationError && (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              
              {/* Left Column: Delivery & Payment Details */}
              <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Delivery Information Card */}
                <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <MapPin size={18} className="text-primary" /> Delivery Information
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ borderBottom: '1px solid rgba(226,232,240,0.6)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Recipient Name</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>{user.name}</strong>
                    </div>

                    <div style={{ borderBottom: '1px solid rgba(226,232,240,0.6)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>GPS Coordinates</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', marginBottom: '0.5rem' }}>
                        Latitude: {userCoords?.lat.toFixed(5) || 'Finding...'}, Longitude: {userCoords?.lon.toFixed(5) || 'Finding...'}
                      </p>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>Complete Delivery Address</label>
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '12px',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem',
                          resize: 'vertical',
                          outline: 'none'
                        }}
                        placeholder="Enter complete delivery address"
                        rows={3}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(226,232,240,0.6)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Distance from Shop</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>{distance} km</strong>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(226,232,240,0.6)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Estimated Time</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{deliveryTime}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods Card */}
                <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <CreditCard size={18} className="text-primary" /> Payment Methods
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* COD Option */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.25rem',
                      border: `1.5px solid ${paymentMethod === 'cod' ? 'var(--primary)' : 'rgba(226, 232, 240, 0.6)'}`,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      backgroundColor: paymentMethod === 'cod' ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                      transition: 'border-color 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--foreground)' }}>Cash on Delivery</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pay when your order reaches your doorstep.</span>
                      </div>
                    </label>

                    {/* Online Payment Option */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.25rem',
                      border: `1.5px solid ${paymentMethod === 'online' ? 'var(--primary)' : 'rgba(226, 232, 240, 0.6)'}`,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      backgroundColor: paymentMethod === 'online' ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                      transition: 'border-color 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'online'}
                        onChange={() => setPaymentMethod('online')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ width: '100%' }}>
                        <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--foreground)' }}>Online Payment (UPI Scan & Pay)</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate a secure QR code to pay instantly.</span>

                        {paymentMethod === 'online' && (
                          <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid rgba(226, 232, 240, 0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '1rem'
                          }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Scan UPI QR code</span>
                            
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=nexthood@bank%26pn=Nexthood%2520Sourced%26am=${grandTotal}%26cu=INR`}
                              alt="UPI QR Code"
                              style={{ border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0.5rem', borderRadius: '12px' }}
                            />

                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={handleSimulatePayment}
                                disabled={confirmingPayment || paymentConfirmed}
                                className="btn btn-primary"
                                style={{ flex: 1, fontSize: '0.75rem', padding: '0.55rem 0', borderRadius: '8px' }}
                              >
                                {confirmingPayment ? 'Paying...' : paymentConfirmed ? '🟢 Verified Success' : 'Simulate Success'}
                              </button>
                              <button
                                type="button"
                                onClick={handleSimulatePaymentFailure}
                                disabled={confirmingPayment || paymentConfirmed}
                                className="btn btn-secondary"
                                style={{ flex: 1, fontSize: '0.75rem', padding: '0.55rem 0', borderRadius: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                              >
                                Simulate Failure
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary Card */}
              <aside style={{ width: '420px', flexShrink: 0, position: 'sticky', top: '100px' }}>
                <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <ShoppingBag size={18} className="text-primary" /> Order Summary
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {cartItems.map((item) => (
                      <div key={item.product.id} style={{ display: 'flex', justifyItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(226,232,240,0.6)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', color: 'var(--foreground)' }}>{item.product.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity: {item.quantity}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>₹{item.product.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calculations */}
                  <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <strong style={{ color: 'var(--foreground)' }}>₹{subtotal}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Delivery Charge</span>
                      <strong style={{ color: 'var(--foreground)' }}>₹{deliveryCharge}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Platform Fee</span>
                      <strong style={{ color: 'var(--foreground)' }}>₹{platformFee}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>GST (5%)</span>
                      <strong style={{ color: 'var(--foreground)' }}>₹{taxes}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '1rem', fontSize: '1.1rem' }}>
                      <span style={{ color: 'var(--foreground)', fontWeight: 800 }}>Grand Total</span>
                      <strong style={{ color: 'var(--primary)', fontWeight: 800 }}>₹{grandTotal}</strong>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePlaceOrder}
                    disabled={paymentMethod === 'online' && !paymentConfirmed}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.85rem 0',
                      marginTop: '1.5rem',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                      opacity: (paymentMethod === 'online' && !paymentConfirmed) ? 0.5 : 1,
                      cursor: (paymentMethod === 'online' && !paymentConfirmed) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Place Sourced Order
                  </motion.button>
                </div>
              </aside>

            </div>
          )}

        </div>
      </main>
    </>
  );
}
