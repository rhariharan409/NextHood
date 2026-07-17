'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface User {
  id: string;
  email: string;
  role: string;
  name: string; // business_name
}

interface OrderRecord {
  orderId: string;
  shopName: string;
  grandTotal: number;
  deliveryTime: string;
  created_at: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

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
          setUser(data.user);
        } else {
          router.push('/seller/auth');
          return;
        }

        // Load active orders from localStorage
        const stored = JSON.parse(localStorage.getItem('nexthood_orders') || '[]');
        
        // Inject mock logistics plans for older orders that don't have them
        const processed = stored.map((o: any, idx: number) => {
          if (!o.logisticsPlan) {
            const drivers = ['Ramesh Kumar', 'Suresh Singh', 'Arjun Dev', 'Vikram Sen'];
            return {
              ...o,
              logisticsPlan: {
                vehicle: '🏍 Bike',
                icon: '🏍',
                reason: 'Standard local bike dispatch based on lightweight product criteria.',
                deliveryTime: '12 Minutes',
                fuelCost: 0,
                distance: 1.2,
                co2Saved: '100% (Zero emission electric cycle)',
                driverName: drivers[idx % drivers.length],
                expectedPickup: '5 mins'
              }
            };
          }
          return o;
        });

        // Add default mock orders if none exist so the seller portal is fully populated on load
        if (processed.length === 0) {
          processed.push({
            orderId: 'NH-829103',
            shopName: data.user.name,
            grandTotal: 570,
            deliveryTime: '10-15 mins',
            created_at: new Date().toISOString(),
            logisticsPlan: {
              vehicle: '❄ Refrigerated Vehicle',
              icon: '❄',
              reason: 'Contains cold-chain items (Fudge Cake) requiring regulated cooling.',
              deliveryTime: '18 Minutes',
              fuelCost: 24,
              distance: 2.0,
              co2Saved: '15% (Reduced emissions)',
              driverName: 'Arjun Dev',
              expectedPickup: '4 mins'
            }
          }, {
            orderId: 'NH-928172',
            shopName: data.user.name,
            grandTotal: 120,
            deliveryTime: '10-15 mins',
            created_at: new Date().toISOString(),
            logisticsPlan: {
              vehicle: '🏍 Bike',
              icon: '🏍',
              reason: 'Small local dispatch with 1 product under 2 km.',
              deliveryTime: '10 Minutes',
              fuelCost: 0,
              distance: 0.8,
              co2Saved: '100% (Zero emission electric cycle)',
              driverName: 'Ramesh Kumar',
              expectedPickup: '3 mins'
            }
          });
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
              Smart Logistic Dispatches
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((ord) => {
                const plan = ord.logisticsPlan || {
                  vehicle: '🏍 Bike',
                  icon: '🏍',
                  reason: 'Standard local dispatcher.',
                  deliveryTime: '12 Mins',
                  fuelCost: 0,
                  distance: 1.2,
                  co2Saved: '100%',
                  driverName: 'Ramesh Kumar',
                  expectedPickup: '5 mins'
                };

                return (
                  <div key={ord.orderId} style={{
                    padding: '1.5rem',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.25rem 0.5rem', borderRadius: '3px', fontWeight: 700 }}>
                          {ord.orderId}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pickup: <strong>{plan.expectedPickup}</strong></span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '2rem' }}>{plan.icon}</span>
                        <div>
                          <strong style={{ fontSize: '1rem', display: 'block' }}>{plan.vehicle}</strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Driver: <strong>{plan.driverName}</strong> • Distance: <strong>{plan.distance} km</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Est. Delivery</span>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>{plan.deliveryTime}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Reason: {plan.reason}</span>
                    </div>
                  </div>
                );
              })}
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

        </div>
      </main>
    </>
  );
}
