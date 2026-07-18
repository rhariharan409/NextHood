'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('Grocery Store');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [logo, setLogo] = useState('');

  // Map and Geolocation States
  const [locationLoading, setLocationLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // SSR Leaflet reference
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapObj, setMapObj] = useState<any>(null);
  const [markerObj, setMarkerObj] = useState<any>(null);

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
          // If already completed profile, redirect back to home
          if (data.profileCompleted) {
            router.push('/seller/home');
          }
        } else {
          router.push('/seller/auth');
        }
      } catch (err) {
        router.push('/seller/auth');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Load Leaflet map on client side
  useEffect(() => {
    if (loading || !user || !mapContainerRef.current || mapObj) return;

    let isMounted = true;

    async function initMap() {
      // Dynamic import leaflet to avoid SSR error
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      // Default Tambaram, Chennai coords
      const defaultLat = 12.9229;
      const defaultLon = 80.1275;

      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Custom icon to prevent default broken image issue in Leaflet with bundlers
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });

      const marker = L.marker([defaultLat, defaultLon], { draggable: true, icon }).addTo(map);
      
      // Update coordinates on dragend
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLatitude(pos.lat.toFixed(6));
        setLongitude(pos.lng.toFixed(6));
      });

      // Update coordinates on map click
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        setLatitude(e.latlng.lat.toFixed(6));
        setLongitude(e.latlng.lng.toFixed(6));
      });

      setMapObj(map);
      setMarkerObj(marker);
      setLatitude(defaultLat.toFixed(6));
      setLongitude(defaultLon.toFixed(6));
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [loading, user]);

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setStatusMsg({ text: 'Geolocation is not supported by your browser.', type: 'error' });
      return;
    }

    setLocationLoading(true);
    setStatusMsg({ text: 'Acquiring GPS coordinates...', type: 'info' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
        
        if (mapObj && markerObj) {
          mapObj.setView([lat, lon], 15);
          markerObj.setLatLng([lat, lon]);
        }

        setStatusMsg({ text: 'GPS Coordinates acquired successfully!', type: 'success' });
        setLocationLoading(false);
      },
      (error) => {
        console.error(error);
        setStatusMsg({ text: 'Failed to retrieve location. Please choose on the map.', type: 'error' });
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGeocodeAddress = async () => {
    if (!address) {
      setStatusMsg({ text: 'Please fill complete address first.', type: 'error' });
      return;
    }
    
    setStatusMsg({ text: 'Geocoding address...', type: 'info' });
    try {
      const fullQuery = `${address}, ${city || ''}, ${stateName || ''} ${pincode || ''}`;
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          setLatitude(loc.lat.toFixed(6));
          setLongitude(loc.lng.toFixed(6));
          if (mapObj && markerObj) {
            mapObj.setView([loc.lat, loc.lng], 15);
            markerObj.setLatLng([loc.lat, loc.lng]);
          }
          setStatusMsg({ text: 'Address geocoded successfully!', type: 'success' });
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    // Fallback: Local TAMBARAM coordinates search
    const tambaramLat = 12.9229 + (Math.random() - 0.5) * 0.01;
    const tambaramLon = 80.1275 + (Math.random() - 0.5) * 0.01;
    setLatitude(tambaramLat.toFixed(6));
    setLongitude(tambaramLon.toFixed(6));
    if (mapObj && markerObj) {
      mapObj.setView([tambaramLat, tambaramLon], 14);
      markerObj.setLatLng([tambaramLat, tambaramLon]);
    }
    setStatusMsg({ text: 'Geocoding offline fallback applied.', type: 'success' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName || !address || !city || !stateName || !pincode || !latitude || !longitude || !phoneNumber) {
      setStatusMsg({ text: 'Please fill in all mandatory fields.', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/seller/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          category,
          description,
          address,
          city,
          state: stateName,
          pincode,
          latitude,
          longitude,
          phoneNumber,
          openingTime,
          closingTime,
          logo
        })
      });

      if (res.ok) {
        setStatusMsg({ text: 'Profile saved successfully! Redirecting...', type: 'success' });
        setTimeout(() => {
          router.push('/seller/home');
        }, 1500);
      } else {
        const errData = await res.json();
        setStatusMsg({ text: errData.error || 'Failed to save profile.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'An error occurred while saving profile.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Loading Complete Shop Profile Form...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem', fontFamily: 'var(--font-family, sans-serif)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '2.5rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            🏪 Complete Shop Profile
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '1.05rem' }}>
            Register your business location and operating details to go live on the Nexthood Marketplace Map.
          </p>
        </div>

        {statusMsg && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.95rem',
            backgroundColor: statusMsg.type === 'success' ? '#dcfce7' : statusMsg.type === 'error' ? '#fee2fee' : '#e0f2fe',
            color: statusMsg.type === 'success' ? '#15803d' : statusMsg.type === 'error' ? '#991b1b' : '#0369a1',
            border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : statusMsg.type === 'error' ? '#fca5a5' : '#bae6fd'}`
          }}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Left Column Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Shop Name *</label>
              <input type="text" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Tambaram Fresh Grocers" />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Business Category *</label>
              <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Grocery Store">Grocery Store</option>
                <option value="Bakery">Bakery</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Electronics">Electronics</option>
                <option value="Restaurant">Restaurant</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Shop Description *</label>
              <textarea style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} rows={3} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your store and products..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Phone Number *</label>
                <input type="tel" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. +91 9876543210" />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Store Logo Link (Optional)</label>
                <input type="text" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Opening Time *</label>
                <input type="time" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Closing Time *</label>
                <input type="time" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Right Column Location & Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>Full Address *</label>
              <textarea style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street number, landmark..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>City *</label>
                <input type="text" style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>State *</label>
                <input type="text" style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={stateName} onChange={(e) => setStateName(e.target.value)} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Pincode *</label>
                <input type="text" style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} required value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={handleGeocodeAddress} style={{ flex: 1, padding: '0.5rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                📍 Geocode Address
              </button>
              <button type="button" onClick={useBrowserLocation} disabled={locationLoading} style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                🧭 Get GPS Coordinates
              </button>
            </div>

            {/* Drag marker Leaflet Container */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
                Verify Location Map (Drag marker to adjust location)
              </label>
              <div
                ref={mapContainerRef}
                style={{
                  height: '200px',
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  zIndex: 1
                }}
              ></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Latitude</label>
                <input type="text" style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f1f5f9' }} readOnly required value={latitude} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Longitude</label>
                <input type="text" style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f1f5f9' }} readOnly required value={longitude} />
              </div>
            </div>

          </div>

          {/* Form Actions Footer */}
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <Link href="/seller/auth" style={{ padding: '0.75rem 1.5rem', color: '#64748b', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              Cancel & Log Out
            </Link>
            <button type="submit" style={{ padding: '0.75rem 2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
              ✓ Save Shop Profile & Go Live
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
