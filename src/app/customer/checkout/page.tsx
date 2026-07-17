'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart, CartItem } from '@/context/CartContext';
import { getDistance } from '@/lib/overpass';

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

  // 2. Reserve stock immediately when checkout page loads (Tatkal / flash sale style)
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
      // If orderConfirmed is false when leaving checkout page, release reservations back to stock pool
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
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const platformFee = 5;
  const taxes = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal > 0 ? subtotal + deliveryCharge + platformFee + taxes : 0;

  // Simulate online payment verification
  const handleSimulatePayment = () => {
    setConfirmingPayment(true);
    setTimeout(() => {
      setPaymentConfirmed(true);
      setConfirmingPayment(false);
    }, 2000);
  };

  // Simulate payment failure (Failure Handling & stock restoration)
  const handleSimulatePaymentFailure = async () => {
    setConfirmingPayment(true);
    setTimeout(async () => {
      setConfirmingPayment(false);
      setPaymentConfirmed(false);
      
      // Automatically restore reserved inventory
      await releaseReservations(reservedItems);
      setReservedItems({});
      setReservationError('Online payment failed. Your reserved items have been restored to active inventory.');
    }, 1500);
  };

  const handlePlaceOrder = () => {
    if (cartItems.length === 0 || !shop) return;
    
    const orderId = 'NH-' + Math.floor(100000 + Math.random() * 900000);

    // Calculate logistics optimizer attributes
    const perishables = ['cake', 'muffin', 'burger', 'pizza', 'salad', 'paracetamol', 'chewables', 'apple', 'tomato', 'milk', 'egg'];
    const hasPerishable = cartItems.some(i => perishables.some(p => i.product.name.toLowerCase().includes(p)));
    const itemCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

    let vehicle = '🏍 Bike';
    let icon = '🏍';
    let reason = `Small order with only ${itemCount} products and delivery distance of ${distance} km. A bike provides the fastest and most cost-effective delivery.`;
    let timeEst = '12 Minutes';
    let fuelCost = 0;
    let co2Saved = '100% (Zero emission electric cycle)';

    if (hasPerishable) {
      vehicle = '❄ Refrigerated Vehicle';
      icon = '❄';
      reason = 'This order contains temperature-sensitive perishable items. A refrigerated container ensures freshness.';
      timeEst = `${Math.round(10 + distance * 4)} Minutes`;
      fuelCost = Math.round(distance * 12);
      co2Saved = '15% (Reduced emissions)';
    } else if (itemCount >= 100) {
      vehicle = '🚚 Lorry / Mini Truck';
      icon = '🚚';
      reason = `Bulk wholesale order with ${itemCount} items. Requiring heavy carriage transport over ${distance} km.`;
      timeEst = `${Math.round(25 + distance * 5)} Minutes`;
      fuelCost = Math.round(distance * 25);
      co2Saved = '0% (Standard mini truck)';
    } else if (itemCount >= 20) {
      vehicle = '🚐 Mini Van';
      icon = '🚐';
      reason = `Large bulk grocery shopping with ${itemCount} items. Optimized for mini van volume capacity.`;
      timeEst = `${Math.round(18 + distance * 4.5)} Minutes`;
      fuelCost = Math.round(distance * 16);
      co2Saved = '10% (Multi-stop delivery)';
    } else if (itemCount >= 6 || distance > 8) {
      vehicle = '🚗 Car';
      icon = '🚗';
      reason = `Medium size order with ${itemCount} items over ${distance} km distance. Car transit chosen for volume security.`;
      timeEst = `${Math.round(12 + distance * 4)} Minutes`;
      fuelCost = Math.round(distance * 10);
      co2Saved = '30% (E-vehicle hybrid)';
    }

    const plan = {
      vehicle,
      icon,
      reason,
      deliveryTime: timeEst,
      fuelCost,
      distance,
      co2Saved,
      driverName: ['Ramesh Kumar', 'Suresh Singh', 'Arjun Dev', 'Vikram Sen'][Math.floor(Math.random() * 4)],
      expectedPickup: '5 mins'
    };

    setLogisticsPlan(plan);

    const savedOrder = {
      orderId,
      shopName: shop.name,
      items: cartItems,
      grandTotal,
      deliveryTime,
      created_at: new Date().toISOString(),
      logisticsPlan: plan
    };

    // Save order record to localStorage
    const previousOrders = JSON.parse(localStorage.getItem('nexthood_orders') || '[]');
    localStorage.setItem('nexthood_orders', JSON.stringify([...previousOrders, savedOrder]));

    // Clear reservedItems state since reservation is now finalized as a successful order
    setReservedItems({});

    // Transition to success screen
    setConfirmedOrderId(orderId);
    setConfirmedDeliveryTime(timeEst);
    setOrderConfirmed(true);

    // Clear active shopping cart
    clearCart();
  };

  const handleBackLink = async () => {
    // Explicitly release stock before navigating away
    if (Object.keys(reservedItems).length > 0) {
      await releaseReservations(reservedItems);
      setReservedItems({});
    }
    router.push(shop ? `/customer/shop/${shop.id}` : '/customer/home');
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
        Preparing checkout...
      </div>
    );
  }

  if (!user) return null;

  // Confirmation Success Screen
  if (orderConfirmed) {
    return (
      <>
        <Header />
        <main style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', textAlign: 'center', padding: '4rem 3rem' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1.5rem' }}>🎉</span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--primary)',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              Order Placed Successfully
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
              color: 'var(--foreground)'
            }}>
              Order Confirmed
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.5', marginBottom: '2.5rem' }}>
              Your order from <strong style={{ color: 'var(--foreground)' }}>{shop?.name || 'the merchant'}</strong> has been accepted.
            </p>

            <div style={{
              backgroundColor: 'var(--secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem 2rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                <strong style={{ fontFamily: 'monospace' }}>{confirmedOrderId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Delivery:</span>
                <strong style={{ color: 'var(--primary)' }}>{confirmedDeliveryTime}</strong>
              </div>
            </div>

            {logisticsPlan && (
              <div className="card" style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                textAlign: 'left',
                marginBottom: '3rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                  🚚 Smart Delivery Plan
                </strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>{logisticsPlan.icon}</span>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{logisticsPlan.vehicle}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Driver: <strong>{logisticsPlan.driverName}</strong></p>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                  {logisticsPlan.reason}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Distance:</span>
                    <strong>{logisticsPlan.distance} km</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Delivery Est:</span>
                    <strong>{logisticsPlan.deliveryTime}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Fuel Cost:</span>
                    <strong>₹{logisticsPlan.fuelCost}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>CO₂ Saved:</span>
                    <strong style={{ color: 'var(--primary)' }}>{logisticsPlan.co2Saved}</strong>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => router.push('/customer/home')} className="btn btn-primary" style={{ width: '100%' }}>
              Back to Home
            </button>
          </div>
        </main>
      </>
    );
  }

  // Cart is Empty Screen
  if (cartItems.length === 0) {
    return (
      <>
        <Header />
        <main style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '3.5rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛒</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Your cart is empty
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Looks like you haven't added any products to your cart yet.
            </p>
            <button onClick={() => router.push('/customer/home')} className="btn btn-primary" style={{ width: '100%' }}>
              Go Explore Shops
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
            <button
              onClick={handleBackLink}
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0
              }}
            >
              ← Return to shop
            </button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
              Secure Checkout
            </h1>
          </div>

          {reservingStock && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              color: 'var(--primary)',
              fontWeight: 600,
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              ⚡ Reserving stock slots in real-time...
            </div>
          )}

          {reservationError && (
            <div className="message message-error" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{reservationError}</span>
              <button
                onClick={handleBackLink}
                className="btn btn-primary"
                style={{ width: '200px', fontSize: '0.85rem', padding: '0.5rem 0' }}
              >
                Go Back to Shop
              </button>
            </div>
          )}

          {!reservingStock && !reservationError && (
            <div style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              alignItems: 'flex-start'
            }}>
              
              {/* Left Column: Delivery & Payment Details */}
              <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Delivery Information Card */}
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📍</span> Delivery Information
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Deliver to</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--foreground)' }}>{user.name}</strong>
                    </div>

                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Address Details</span>
                      <p style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>
                        GPS Located Neighborhood, Latitude: {userCoords?.lat.toFixed(5) || 'Searching...'}, Longitude: {userCoords?.lon.toFixed(5) || 'Searching...'}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ backgroundColor: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Distance from Shop</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>{distance} km</strong>
                      </div>
                      <div style={{ backgroundColor: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Estimated Time</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{deliveryTime}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods Card */}
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💳</span> Payment Methods
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* COD Option */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.25rem',
                      border: `1.5px solid ${paymentMethod === 'cod' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      backgroundColor: paymentMethod === 'cod' ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                      transition: 'var(--transition)'
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
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pay when your order is delivered.</span>
                      </div>
                    </label>

                    {/* Online Payment Option */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.25rem',
                      border: `1.5px solid ${paymentMethod === 'online' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      backgroundColor: paymentMethod === 'online' ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                      transition: 'var(--transition)'
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
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generate a QR code to pay with any UPI app.</span>

                        {paymentMethod === 'online' && (
                          <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '1rem'
                          }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Scan & Pay</span>
                            
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                `upi://pay?pa=nexthood@pay&pn=Nexthood&am=${grandTotal}&cu=INR`
                              )}`}
                              alt="Payment QR Code"
                              style={{
                                width: '180px',
                                height: '180px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.5rem',
                                backgroundColor: '#ffffff'
                              }}
                            />
                            
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{grandTotal}</span>

                            {!paymentConfirmed ? (
                              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={handleSimulatePayment}
                                  disabled={confirmingPayment}
                                  className="btn btn-primary"
                                  style={{ flex: 1, maxWidth: '180px', fontSize: '0.85rem', padding: '0.5rem 0' }}
                                >
                                  {confirmingPayment ? 'Verifying...' : 'Simulate Success'}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSimulatePaymentFailure}
                                  disabled={confirmingPayment}
                                  className="btn btn-secondary"
                                  style={{ flex: 1, maxWidth: '180px', fontSize: '0.85rem', padding: '0.5rem 0', color: '#ef4444', borderColor: '#fca5a5' }}
                                >
                                  Simulate Failure
                                </button>
                              </div>
                            ) : (
                              <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                ✅ Payment Confirmed! You can now place your order.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>

                  </div>
                </div>

              </div>

              {/* Right Column: Sticky Order Summary */}
              <div style={{
                width: '380px',
                position: 'sticky',
                top: '100px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                    Order Summary
                  </h2>

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
                    Ordering from <strong>{shop?.name || 'Local Business'}</strong>
                  </span>

                  {/* Items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                    {cartItems.map((item) => (
                      <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                          />
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.85rem' }}>{item.product.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600 }}>₹{item.product.price * item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal computing */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Charge</span>
                      <span>₹{deliveryCharge}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Platform Fee</span>
                      <span>₹{platformFee}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Taxes (5% GST)</span>
                      <span>₹{taxes}</span>
                    </div>

                    <div style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: '1.25rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--foreground)'
                    }}>
                      <span>Grand Total</span>
                      <span>₹{grandTotal}</span>
                    </div>
                  </div>

                  {/* Place Order Trigger */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={paymentMethod === 'online' && !paymentConfirmed}
                    className="btn btn-primary btn-large"
                    style={{
                      width: '100%',
                      marginTop: '2rem',
                      boxShadow: '0 10px 20px rgba(16, 185, 129, 0.15)',
                      opacity: paymentMethod === 'online' && !paymentConfirmed ? 0.6 : 1,
                      cursor: paymentMethod === 'online' && !paymentConfirmed ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Place Order
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
    </>
  );
}
