'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Business } from '@/lib/overpass';

import { useTheme } from '@/context/ThemeContext';

interface MapProps {
  userLat: number;
  userLon: number;
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness: (business: Business) => void;
}

// Custom Green Leaflet Icon for User Location (Emerald Green Pulse Pin)
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background-color: rgba(16, 185, 129, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify: center;
      justify-content: center;
      animation: pulse-ring 2s infinite;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background-color: #10b981;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      "></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.95); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.5; }
        100% { transform: scale(0.95); opacity: 0; }
      }
    </style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom Gray Icon for Unregistered/Static Shops
const staticShopIcon = L.divIcon({
  className: 'custom-static-shop-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background-color: #f1f5f9;
      border: 2px solid #94a3b8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      font-size: 1.1rem;
      color: #64748b;
    ">
      🏪
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Custom Green Icon for Registered/Active Shops
const activeShopIcon = L.divIcon({
  className: 'custom-active-shop-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background-color: #ffffff;
      border: 2px solid #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      font-size: 1.1rem;
      position: relative;
    ">
      🏪
      <span style="
        position: absolute;
        top: -4px;
        right: -4px;
        background-color: #10b981;
        color: white;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid white;
      ">✓</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Highlighted active shop icon
const selectedActiveShopIcon = L.divIcon({
  className: 'custom-selected-active-shop-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background-color: #10b981;
      border: 3px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
      font-size: 1.3rem;
      transform: translateY(-4px) scale(1.1);
      position: relative;
    ">
      🏪
      <span style="
        position: absolute;
        top: -2px;
        right: -2px;
        background-color: #ffffff;
        color: #10b981;
        border-radius: 50%;
        width: 14px;
        height: 14px;
        font-size: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      ">✓</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Highlighted static shop icon
const selectedStaticShopIcon = L.divIcon({
  className: 'custom-selected-static-shop-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background-color: #64748b;
      border: 3px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 15px -3px rgba(100, 116, 139, 0.3);
      font-size: 1.3rem;
      transform: translateY(-4px) scale(1.1);
    ">
      🏪
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Helper component to dynamically pan/zoom map on coordinate changes
function ChangeMapView({ coords, selectedCoords }: { coords: [number, number]; selectedCoords: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedCoords) {
      map.flyTo(selectedCoords, 16, { animate: true, duration: 1.5 });
    } else {
      map.flyTo(coords, 14, { animate: true, duration: 1 });
    }
  }, [coords, selectedCoords, map]);

  return null;
}

export default function Map({
  userLat,
  userLon,
  businesses,
  selectedBusiness,
  onSelectBusiness,
}: MapProps) {
  const userPosition: [number, number] = [userLat, userLon];
  const { theme } = useTheme();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={userPosition}
        zoom={14}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
        />

        {/* User position marker */}
        <Marker position={userPosition} icon={userIcon}>
          <Popup>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Your Location</div>
          </Popup>
        </Marker>

        {/* Business markers */}
        {businesses.map((biz) => {
          const isSelected = selectedBusiness?.id === biz.id;
          return (
            <Marker
              key={biz.id}
              position={[biz.lat, biz.lon]}
              icon={isSelected ? ((biz as any).isRegistered ? selectedActiveShopIcon : selectedStaticShopIcon) : ((biz as any).isRegistered ? activeShopIcon : staticShopIcon)}
              eventHandlers={{
                click: () => {
                  onSelectBusiness(biz);
                },
              }}
            >
              <Popup>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{biz.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{biz.category}</div>
              </Popup>
            </Marker>
          );
        })}

        <ChangeMapView
          coords={userPosition}
          selectedCoords={selectedBusiness ? [selectedBusiness.lat, selectedBusiness.lon] : null}
        />
      </MapContainer>
    </div>
  );
}
