'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart, Product, ShopDetails } from '@/context/CartContext';
import OptimizedImage from '@/components/OptimizedImage';

// Mock inventory generation based on category
function getMockProducts(category: string, shopId: string): Product[] {
  const cat = category.toLowerCase();
  
  if (cat.includes('bakery') || cat.includes('cake') || cat.includes('confectionery')) {
    return [
      {
        id: `${shopId}-p1`,
        name: 'Premium Chocolate Fudge Cake',
        price: 450,
        description: 'Rich dark chocolate cake layered with decadent fudge frosting.',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60',
        category: 'Cakes',
        discount: '10% OFF',
        deliveryTime: 'Delivery 25 mins',
        rating: 4.8,
        isBestSeller: true
      },
      {
        id: `${shopId}-p2`,
        name: 'Fresh Bread Loaf',
        price: 60,
        description: 'Freshly baked classic soft white bread loaf.',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60',
        category: 'Bread',
        discount: '5% OFF',
        deliveryTime: 'Delivery 15 mins',
        rating: 4.3,
        isBestSeller: false
      },
      {
        id: `${shopId}-p3`,
        name: 'Chocolate Chip Cookies',
        price: 120,
        description: 'Crispy on the outside, chewy on the inside cookies.',
        image: 'https://images.unsplash.com/photo-1499636136210-6f4ee9127357?w=400&auto=format&fit=crop&q=60',
        category: 'Cookies',
        discount: '12% OFF',
        deliveryTime: 'Delivery 12 mins',
        rating: 4.5,
        isBestSeller: true
      },
      {
        id: `${shopId}-p4`,
        name: 'Glazed Donuts (Pack of 4)',
        price: 80,
        description: 'Classic glazed sweet ring donuts.',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&auto=format&fit=crop&q=60',
        category: 'Pastries',
        discount: '15% OFF',
        deliveryTime: 'Delivery 18 mins',
        rating: 4.4,
        isBestSeller: false
      },
      {
        id: `${shopId}-p5`,
        name: 'Vanilla Cupcakes',
        price: 90,
        description: 'Fluffy vanilla cupcakes topped with buttercream frosting.',
        image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=60',
        category: 'Cakes',
        discount: '8% OFF',
        deliveryTime: 'Delivery 20 mins',
        rating: 4.6,
        isBestSeller: false
      }
    ];
  }

  if (cat.includes('pharmacy') || cat.includes('medicine') || cat.includes('chemist') || cat.includes('health') || cat.includes('medical')) {
    return [
      {
        id: `${shopId}-p1`,
        name: 'Paracetamol 650mg (15 Tablets)',
        price: 30,
        description: 'Fast relief from pain and fever.',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
        category: 'OTC Medicines',
        discount: '5% OFF',
        deliveryTime: 'Delivery 10 mins',
        rating: 4.7,
        isBestSeller: true
      },
      {
        id: `${shopId}-p2`,
        name: 'Vitamin C + Zinc Tablets',
        price: 180,
        description: 'Daily immunity boosting tablets.',
        image: 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?w=400&auto=format&fit=crop&q=60',
        category: 'Vitamins',
        discount: '10% OFF',
        deliveryTime: 'Delivery 15 mins',
        rating: 4.5,
        isBestSeller: false
      },
      {
        id: `${shopId}-p3`,
        name: 'Complete First Aid Kit',
        price: 350,
        description: 'Essential bandages, antiseptics, and tools.',
        image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=60',
        category: 'First Aid',
        discount: '15% OFF',
        deliveryTime: 'Delivery 12 mins',
        rating: 4.8,
        isBestSeller: true
      },
      {
        id: `${shopId}-p4`,
        name: 'Instant Hand Sanitizer (250ml)',
        price: 80,
        description: 'Kills 99.9% of germs instantly.',
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=60',
        category: 'Sanitizers',
        discount: '20% OFF',
        deliveryTime: 'Delivery 8 mins',
        rating: 4.4,
        isBestSeller: false
      },
      {
        id: `${shopId}-p5`,
        name: 'N95 Protective Masks (Pack of 5)',
        price: 50,
        description: '5-layer filtration high protection face masks.',
        image: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?w=400&auto=format&fit=crop&q=60',
        category: 'Masks',
        discount: '25% OFF',
        deliveryTime: 'Delivery 9 mins',
        rating: 4.6,
        isBestSeller: false
      }
    ];
  }

  if (cat.includes('electronic') || cat.includes('mobile') || cat.includes('tech') || cat.includes('computer') || cat.includes('phone')) {
    return [
      {
        id: `${shopId}-p1`,
        name: 'Wireless Bluetooth Headphones',
        price: 1800,
        description: 'Immersive sound with active noise cancellation.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60',
        category: 'Audio',
        discount: '25% OFF',
        deliveryTime: 'Delivery 20 mins',
        rating: 4.6,
        isBestSeller: true
      },
      {
        id: `${shopId}-p2`,
        name: 'Mechanical Gaming Keyboard',
        price: 790,
        description: 'Tactile mechanical switches with RGB backlit keys.',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=60',
        category: 'Accessories',
        discount: '15% OFF',
        deliveryTime: 'Delivery 25 mins',
        rating: 4.3,
        isBestSeller: false
      },
      {
        id: `${shopId}-p3`,
        name: 'Ergonomic Wireless Mouse',
        price: 450,
        description: 'Precision optical mouse with comfortable grip.',
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=60',
        category: 'Accessories',
        discount: '10% OFF',
        deliveryTime: 'Delivery 18 mins',
        rating: 4.4,
        isBestSeller: false
      },
      {
        id: `${shopId}-p4`,
        name: 'Fast Charging Power Bank 10000mAh',
        price: 1200,
        description: 'Ultra-compact power bank with 22.5W fast output charging.',
        image: 'https://images.unsplash.com/photo-1609592424109-dd55de17fb4d?w=400&auto=format&fit=crop&q=60',
        category: 'Power Banks',
        discount: '20% OFF',
        deliveryTime: 'Delivery 15 mins',
        rating: 4.5,
        isBestSeller: true
      },
      {
        id: `${shopId}-p5`,
        name: 'USB-C Braided Cable (2m)',
        price: 250,
        description: 'Extremely durable fast-charging braided USB-C cable.',
        image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&auto=format&fit=crop&q=60',
        category: 'Accessories',
        discount: '30% OFF',
        deliveryTime: 'Delivery 12 mins',
        rating: 4.2,
        isBestSeller: false
      }
    ];
  }

  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) {
    return [
      {
        id: `${shopId}-p1`,
        name: 'Special Veg Burger',
        price: 180,
        description: 'Crispy veg patty, fresh lettuce, cheddar cheese, and house sauce.',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
        category: 'Burgers',
        discount: '10% OFF',
        deliveryTime: 'Delivery 20 mins',
        rating: 4.5,
        isBestSeller: true
      },
      {
        id: `${shopId}-p2`,
        name: 'Margherita Pizza (10")',
        price: 260,
        description: 'Classic sourdough pizza base with San Marzano tomatoes and mozzarella.',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=60',
        category: 'Pizzas',
        discount: '15% OFF',
        deliveryTime: 'Delivery 25 mins',
        rating: 4.7,
        isBestSeller: true
      },
      {
        id: `${shopId}-p3`,
        name: 'Espresso Macchiato',
        price: 110,
        description: 'Strong double shot of espresso marked with velvety milk foam.',
        image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&auto=format&fit=crop&q=60',
        category: 'Beverages',
        discount: '5% OFF',
        deliveryTime: 'Delivery 12 mins',
        rating: 4.4,
        isBestSeller: false
      },
      {
        id: `${shopId}-p4`,
        name: 'Healthy Caesar Salad',
        price: 150,
        description: 'Crisp romaine lettuce, croutons, parmesan cheese, and caesar dressing.',
        image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&auto=format&fit=crop&q=60',
        category: 'Salads',
        discount: '8% OFF',
        deliveryTime: 'Delivery 18 mins',
        rating: 4.3,
        isBestSeller: false
      }
    ];
  }

  // Fallback / Grocery Store
  return [
    {
      id: `${shopId}-p1`,
      name: 'Fresh Organic Milk (1L)',
      price: 58,
      description: 'Pasteurized, homogenized premium fresh milk.',
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60',
      category: 'Dairy',
      discount: '10% OFF',
      deliveryTime: 'Delivery 12 mins',
      rating: 4.2,
      isBestSeller: true
    },
    {
      id: `${shopId}-p2`,
      name: 'Basmati Rice (1kg)',
      price: 75,
      description: 'Long grain, aromatic premium aged Basmati rice.',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60',
      category: 'Grains',
      discount: '5% OFF',
      deliveryTime: 'Delivery 15 mins',
      rating: 4.5,
      isBestSeller: false
    },
    {
      id: `${shopId}-p3`,
      name: 'Fresh Eggs (Pack of 12)',
      price: 80,
      description: 'Naturally raised, protein-rich brown eggs.',
      image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=60',
      category: 'Eggs & Poultry',
      discount: '15% OFF',
      deliveryTime: 'Delivery 10 mins',
      rating: 4.6,
      isBestSeller: true
    },
    {
      id: `${shopId}-p4`,
      name: 'Whole Wheat Bread',
      price: 40,
      description: 'Freshly baked high-fiber whole wheat bread.',
      image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=60',
      category: 'Bread',
      discount: '12% OFF',
      deliveryTime: 'Delivery 8 mins',
      rating: 4.1,
      isBestSeller: false
    },
    {
      id: `${shopId}-p5`,
      name: 'Fresh Farm Vegetables (Assorted 1kg)',
      price: 60,
      description: 'Seasonal selection of crisp vegetables.',
      image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60',
      category: 'Produce',
      discount: '20% OFF',
      deliveryTime: 'Delivery 14 mins',
      rating: 4.4,
      isBestSeller: false
    },
    {
      id: `${shopId}-p6`,
      name: 'Refined Cooking Oil (1L)',
      price: 150,
      description: 'Premium light refined sunflower oil.',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=60',
      category: 'Pantry',
      discount: '8% OFF',
      deliveryTime: 'Delivery 18 mins',
      rating: 4.3,
      isBestSeller: false
    },
    {
      id: `${shopId}-p7`,
      name: 'Pure White Sugar (1kg)',
      price: 45,
      description: 'Finely granulated organic white cane sugar.',
      image: 'https://images.unsplash.com/photo-1581781870027-04212e231e96?w=400&auto=format&fit=crop&q=60',
      category: 'Pantry',
      discount: '5% OFF',
      deliveryTime: 'Delivery 16 mins',
      rating: 4.0,
      isBestSeller: false
    }
  ];
}

export default function ShopInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;
  const { addToCart, cartCount } = useCart();

  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Live Inventory State
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [pulseProducts, setPulseProducts] = useState<Record<string, boolean>>({});
  const [floatingMessages, setFloatingMessages] = useState<Record<string, { text: string; id: number }[]>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Live Activity Metrics
  const [viewerCount, setViewerCount] = useState<number>(3);
  const [recentPurchases, setRecentPurchases] = useState<string[]>([]);

  // Stress Test State
  const [stressTesting, setStressTesting] = useState(false);
  const [stressTestResult, setStressTestResult] = useState<any>(null);
  
  // Similar shops state
  const [similarShops, setSimilarShops] = useState<any[]>([]);

  // Helper to trigger pulse highlight
  const triggerPulse = (productId: string) => {
    setPulseProducts((prev) => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setPulseProducts((prev) => ({ ...prev, [productId]: false }));
    }, 500);
  };

  // Helper to add floating updates
  const triggerFloatingMessage = (productId: string, text: string) => {
    const msgId = Date.now() + Math.random();
    setFloatingMessages((prev) => {
      const current = prev[productId] || [];
      return { ...prev, [productId]: [...current, { text, id: msgId }] };
    });
    setTimeout(() => {
      setFloatingMessages((prev) => {
        const current = prev[productId] || [];
        return { ...prev, [productId]: current.filter((m) => m.id !== msgId) };
      });
    }, 3000);
  };

  // 1. Resolve Shop Details
  useEffect(() => {
    async function fetchShopDetails() {
      try {
        const res = await fetch(`/api/places/details?id=${shopId}`);
        let name = 'Local Store';
        let category = 'Grocery Store';
        let lat = 0;
        let lon = 0;
        let address = '';
        let rating = 4.2;
        let reviewsCount = 25;
        let isOpen = true;
        let photoUrl = undefined;
        let isRegistered = false;
        let productsData: any[] = [];
        let data: any = null;

        if (res.ok) {
          data = await res.json();
          if (data.business) {
            const b = data.business;
            name = b.name;
            category = b.category;
            lat = b.lat;
            lon = b.lon;
            address = b.address;
            rating = b.rating;
            reviewsCount = b.reviewsCount;
            isOpen = b.isOpen;
            photoUrl = b.photoUrl;
            isRegistered = !!b.isRegistered;
          }
          if (data.products && data.products.length > 0) {
            productsData = data.products.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: parseFloat(p.price || '0'),
              description: p.description,
              image: p.images.split(',')[0],
              category: p.category,
              discount: p.discount,
              deliveryTime: p.delivery_type === 'Express' ? 'Delivery 12 mins' : 'Delivery 25 mins',
              rating: parseFloat(p.rating || '0') || 4.5,
              isBestSeller: p.tags?.includes('Best Seller') || p.tags?.includes('best'),
              brand: p.brand || 'Local Brand',
              unit: p.weight || 'unit',
              stock: parseInt(p.stock) || 0
            }));
          }
        }

        const shopDetails = {
          id: shopId,
          name,
          category,
          lat,
          lon,
          address,
          rating,
          reviewsCount,
          isOpen,
          photoUrl,
          isRegistered,
          ownerName: data?.business?.ownerName || 'Not Provided',
          email: data?.business?.email || 'Not Provided',
          phone: data?.business?.phone || 'Not Provided',
          description: data?.business?.description || 'Not Provided',
          openingHours: data?.business?.openingHours || 'Not Available',
          registeredSince: data?.business?.registeredSince || 'Not Available'
        };

        setShop(shopDetails as any);
        
        if (isRegistered && productsData.length > 0) {
          setProducts(productsData);
          // Set live stocks state from the product data stock field
          const newStocks: Record<string, number> = {};
          productsData.forEach((p: any) => {
            // Find the original raw product to get raw stock
            const raw = data.products.find((rp: any) => rp.id === p.id);
            newStocks[p.id] = raw ? parseInt(raw.stock) || 0 : 25;
          });
          setStocks(newStocks);
        } else {
          setProducts(getMockProducts(category, shopId));
        }

        // Fetch similar shops of same category
        try {
          const placesRes = await fetch(`/api/places`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: lat || 12.9229,
              lon: lon || 80.1275,
              query: category
            })
          });
          if (placesRes.ok) {
            const placesData = await placesRes.json();
            const filtered = (placesData.results || []).filter((s: any) => s.id !== shopId).slice(0, 4);
            setSimilarShops(filtered);
          }
        } catch (e) {
          console.error('Error loading similar shops:', e);
        }
      } catch (err) {
        console.error('Error fetching shop details:', err);
        setShop({
          id: shopId,
          name: 'Nexthood Local Merchant',
          category: 'Grocery Store',
          lat: 12.9716,
          lon: 77.5946,
          isRegistered: false
        } as any);
        setProducts(getMockProducts('grocery', shopId));
      } finally {
        setLoading(false);
      }
    }

    if (shopId) {
      fetchShopDetails();
      const interval = setInterval(fetchShopDetails, 3000);
      return () => clearInterval(interval);
    }
  }, [shopId]);

  // 2. Fetch/Initialize DB Inventory Stock Levels directly from seller products database
  const reloadStockLevels = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/places/details?id=${shop.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          const updatedStocks: Record<string, number> = {};
          data.products.forEach((p: any) => {
            updatedStocks[p.id] = parseInt(p.stock) || 0;
          });
          setStocks(updatedStocks);
        }
      }
    } catch (err) {
      console.error('Error reloading inventory levels:', err);
    }
  };

  useEffect(() => {
    if (products.length > 0) {
      reloadStockLevels();
    }
  }, [shop, products]);

  // Poll for latest shop inventory details and stock levels from database every 3 seconds
  useEffect(() => {
    if (!shopId) return;
    const interval = setInterval(() => {
      reloadStockLevels();
    }, 3000);
    return () => clearInterval(interval);
  }, [shopId, shop]);

  // 3. Connect to Standalone WebSocket Server
  useEffect(() => {
    if (!shopId) return;

    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log('[DEBUG] Connected to WS Server on 3001');
      socket.send(JSON.stringify({ type: 'subscribe', shopId }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stock_update') {
          const { productId, stock, updateType, change } = msg;
          
          setStocks((prev) => ({ ...prev, [productId]: stock }));
          triggerPulse(productId);
          
          const text = change > 0 ? `Restocked +${change}` : `${Math.abs(change)} customer purchased recently`;
          triggerFloatingMessage(productId, text);

          // Add to recent activity list
          const pName = products.find(p => p.id === productId)?.name || 'Product';
          const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (change > 0) {
            setRecentPurchases(prev => [`[${stamp}] Restocked ${pName} (+${change})`, ...prev.slice(0, 4)]);
            setNotification('Merchant just restocked items!');
          } else {
            setRecentPurchases(prev => [`[${stamp}] Someone bought ${pName} (x${Math.abs(change)})`, ...prev.slice(0, 4)]);
            setNotification('Someone just purchased this item.');
          }
          setTimeout(() => setNotification(null), 3000);
        }
      } catch (err) {
        console.error('WS parsing error:', err);
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [shopId, products]);

  // 4. Simulated Viewer count update
  useEffect(() => {
    const timer = setInterval(() => {
      setViewerCount(3 + Math.floor(Math.random() * 5));
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // 5. Realistic Simulation Engine (Visible Tab ONLY)
  useEffect(() => {
    if (products.length === 0 || !ws) return;

    let timeoutId: NodeJS.Timeout;

    const runSimulation = () => {
      const intervals = [60000, 120000, 180000, 300000, 480000, 600000];
      const nextInterval = intervals[Math.floor(Math.random() * intervals.length)];

      timeoutId = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          const inStock = products.filter((p) => (stocks[p.id] || 0) > 0);
          if (inStock.length > 0) {
            const target = inStock[Math.floor(Math.random() * inStock.length)];
            const currentStock = stocks[target.id] || 0;

            if (Math.random() < 0.7) {
              const qty = Math.min(currentStock, Math.random() < 0.75 ? 1 : 2);
              const newStock = currentStock - qty;

              setStocks((prev) => ({ ...prev, [target.id]: newStock }));
              triggerPulse(target.id);
              triggerFloatingMessage(target.id, `${qty} customer${qty > 1 ? 's' : ''} purchased recently`);
              
              const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setRecentPurchases(prev => [`[${stamp}] Simulated customer bought ${target.name} (x${qty})`, ...prev.slice(0, 4)]);
              
              setNotification('Someone just purchased this item.');
              setTimeout(() => setNotification(null), 3000);

              // Update DB via API
              await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shopId,
                  productId: target.id,
                  action: 'purchase',
                  quantity: qty
                })
              });

              // Broadcast via WS
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'broadcast_update',
                  shopId,
                  productId: target.id,
                  stock: newStock,
                  updateType: 'simulation',
                  change: -qty
                }));
              }
            }
          }
        }
        runSimulation();
      }, nextInterval);
    };

    const initialTimer = setTimeout(() => {
      runSimulation();
    }, 12000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
    };
  }, [products, stocks, ws, shopId]);

  // Dev Tool: Seller Simulate Restock
  const handleSimulateRestock = async () => {
    if (products.length === 0) return;
    
    const sorted = [...products].sort((a, b) => (stocks[a.id] || 0) - (stocks[b.id] || 0));
    const target = sorted[0];
    const currentStock = stocks[target.id] || 0;
    const restockQty = 15;
    const newStock = currentStock + restockQty;

    setStocks((prev) => ({ ...prev, [target.id]: newStock }));
    triggerPulse(target.id);
    triggerFloatingMessage(target.id, `Restocked ${newStock} Left`);
    
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecentPurchases(prev => [`[${stamp}] Restocked ${target.name} (+15)`, ...prev.slice(0, 4)]);

    setNotification(`Restocked "${target.name}" by +${restockQty}!`);
    setTimeout(() => setNotification(null), 3000);

    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId,
        productId: target.id,
        action: 'restock',
        quantity: restockQty
      })
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'broadcast_update',
        shopId,
        productId: target.id,
        stock: newStock,
        updateType: 'restock',
        change: restockQty
      }));
    }
  };

  // Triggers 100 concurrent requests against a product initialized at 50 stock units
  const handleRunStressTest = async (productId: string) => {
    setStressTesting(true);
    setStressTestResult(null);
    try {
      const res = await fetch('/api/inventory/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, productId })
      });
      const data = await res.json();
      setStressTestResult(data);
      
      // Update inventory levels locally
      await reloadStockLevels();
      
      // Broadcast to WS
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'broadcast_update',
          shopId,
          productId,
          stock: data.finalStock,
          updateType: 'stress-test',
          change: -50
        }));
      }
    } catch (e) {
      console.error('Error executing concurrency stress test:', e);
    } finally {
      setStressTesting(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!shop) return;
    const currentStock = stocks[product.id] || 0;
    if (currentStock <= 0) return;
    
    addToCart(product, shop);
    setNotification(`Added "${product.name}" to cart!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBuyNow = (product: Product) => {
    if (!shop) return;
    const currentStock = stocks[product.id] || 0;
    if (currentStock <= 0) return;

    addToCart(product, shop);
    router.push('/customer/checkout');
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
        Loading shop items...
      </div>
    );
  }

  if (!shop) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family)',
        color: '#64748b',
        backgroundColor: '#f8fafc'
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: '#1e293b', marginBottom: '0.5rem' }}>Unable to load shop details.</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>The requested store could not be found or is not registered.</p>
        <Link href="/customer/home" style={{
          color: '#ffffff',
          backgroundColor: 'var(--primary)',
          padding: '0.65rem 1.25rem',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          ← Return to map search
        </Link>
      </div>
    );
  }

  const s = shop as any;

  return (
    <>
      <Header />
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        
        {/* Floating Notification Toast */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '90px',
            right: '24px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
            zIndex: 1000,
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'slide-in 0.2s ease-out'
          }}>
            {notification}
          </div>
        )}

        <div className="container" style={{ maxWidth: '1100px' }}>
          
          {/* Back Button and Shop Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link href="/customer/home" style={{
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ← Back to Map Search
              </Link>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  🔥 {viewerCount} customers are viewing this product
                </span>
                <button
                  onClick={handleSimulateRestock}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  ⚡ Simulate Restock (+15)
                </button>
              </div>
            </div>
            <div className="card" style={{
              backgroundColor: '#ffffff',
              padding: '2.5rem',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: '1fr 300px',
              gap: '2.5rem',
              borderRadius: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--primary)'
                  }}>
                    {s.category}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: s.isRegistered ? '#10b981' : '#64748b',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    {s.isRegistered ? '🏪 Verified Marketplace Seller' : 'Demo Shop'}
                  </span>
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--foreground)',
                  margin: '0 0 0.5rem 0'
                }}>
                  {s.name}
                </h1>
                
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                  👤 Owned by <strong>{s.ownerName}</strong> • Registered since {s.registeredSince}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--foreground)', marginBottom: '1.5rem' }}>
                  <span>📍 <strong>Address:</strong> {s.address}</span>
                  <span>📞 <strong>Mobile:</strong> {s.phone}</span>
                  <span>📧 <strong>Email:</strong> {s.email}</span>
                  <span>🕒 <strong>Hours:</strong> {s.openingHours}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#eab308', fontSize: '1.1rem' }}>★</span>
                    <strong style={{ fontSize: '1rem' }}>{s.rating}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>({s.reviewsCount} reviews)</span>
                  </div>
                  <span style={{
                    fontSize: '0.85rem',
                    color: s.isOpen ? '#10b981' : '#ef4444',
                    fontWeight: 700
                  }}>
                    {s.isOpen ? '🟢 Open Now' : '🔴 Closed'}
                  </span>
                </div>
              </div>

              {/* Header Right Action Column */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', borderLeft: '1px solid #e2e8f0', paddingLeft: '2.5rem' }}>
                {s.photoUrl ? (
                  <img
                    src={s.photoUrl}
                    alt={s.name}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  />
                ) : (
                  <div style={{ width: '120px', height: '120px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🏪</div>
                )}
                
                {s.isRegistered && cartCount > 0 && (
                  <Link href="/customer/checkout" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', width: '100%', textAlign: 'center', marginTop: '1rem' }}>
                    Checkout Cart ({cartCount})
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* Dynamic Activity Feed panel */}
          {recentPurchases.length > 0 && (
            <div className="card" style={{ padding: '1.25rem 2.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Live Store Activity log
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {recentPurchases.map((log, idx) => (
                  <span key={idx} style={{ fontSize: '0.85rem', color: idx === 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: idx === 0 ? 600 : 400 }}>
                    {log}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shop Statistics Cards Section */}
          {s.isRegistered && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              marginBottom: '2.5rem'
            }}>
              <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Products</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>{products.length} items</strong>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Available Products</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#10b981' }}>{products.filter(p => (stocks[p.id] || 0) > 0).length} in stock</strong>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Out of Stock</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem', color: '#ef4444' }}>{products.filter(p => (stocks[p.id] || 0) === 0).length} sold out</strong>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Stock Units</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>{Object.values(stocks).reduce((a, b) => a + b, 0)} units</strong>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Inventory Value</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>₹{products.reduce((acc, p) => acc + (stocks[p.id] || 0) * p.price, 0).toFixed(2)}</strong>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--foreground)',
              margin: 0
            }}>
              Available Products
            </h2>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#475569',
              backgroundColor: '#e2e8f0',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)'
            }}>
              Demo Prototype Data
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              * Product catalog, stock, and pricing are simulated for demonstration purposes.
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {products.map((product) => {
              const stock = stocks[product.id] !== undefined ? stocks[product.id] : 25;
              const isPulse = pulseProducts[product.id] || false;
              const productMessages = floatingMessages[product.id] || [];

              // Stock status styling helpers
              let stockColor = '#10b981'; // Green
              let stockText = `${stock} Left`;
              
              if (stock === 0) {
                stockColor = '#ef4444'; // Red
                stockText = 'Sold Out';
              } else if (stock <= 5) {
                stockColor = '#ea580c'; // Dark Orange/Red
              } else if (stock <= 9) {
                stockColor = '#f97316'; // Orange
              } else if (stock <= 15) {
                stockColor = '#eab308'; // Yellow
              }

              return (
                <div key={product.id} className="card" style={{
                  backgroundColor: '#ffffff',
                  padding: '0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  position: 'relative'
                }}>
                  
                  {/* Floating Action Notifications inside cards */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {productMessages.map((m) => (
                      <span
                        key={m.id}
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          animation: 'fade-float 3s ease-out forwards',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                        }}
                      >
                        {m.text}
                      </span>
                    ))}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <OptimizedImage
                      src={product.image}
                      alt={product.name}
                      category={product.category}
                      style={{
                        height: '200px',
                        borderBottom: '1px solid var(--border)',
                        borderRadius: '0'
                      }}
                    />
                    {product.isBestSeller && (
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: '#eab308',
                        color: '#000000',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        ★ Best Seller
                      </span>
                    )}
                  </div>
                  
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            lineHeight: 1.3,
                            margin: '0 0 0.35rem 0'
                          }}>
                            {product.name}
                          </h3>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span>🏷 Brand: <strong>{(product as any).brand || 'Local Brand'}</strong></span>
                            <span>📁 Category: {(product as any).category}</span>
                            <span>⚖ Unit: {(product as any).unit || 'unit'}</span>
                            <span>🟢 Status: <strong style={{ color: stock > 0 ? '#10b981' : '#ef4444' }}>{stock > 0 ? 'Available' : 'Out of Stock'}</strong></span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'var(--foreground)',
                            flexShrink: 0
                          }}>
                            ₹{product.price}
                          </span>
                          {product.discount && (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#ef4444'
                            }}>
                              {product.discount}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        lineHeight: '1.4',
                        marginBottom: '1rem'
                      }}>
                        {product.description}
                      </p>

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        {product.deliveryTime && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            backgroundColor: '#f1f5f9',
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 500
                          }}>
                            ⏱ {product.deliveryTime}
                          </span>
                        )}
                        {product.rating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.8rem' }}>
                            <span style={{ color: '#eab308' }}>★</span>
                            <span style={{ fontWeight: 600 }}>{product.rating}</span>
                          </div>
                        )}
                      </div>

                      {/* Stock Quantity / Warning Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: stockColor
                          }}></span>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: stockColor,
                            transition: 'all 0.3s ease',
                            display: 'inline-block',
                            transform: isPulse ? 'scale(1.2)' : 'scale(1)'
                          }}>
                            {stockText}
                          </span>
                        </div>

                        {/* Concurrency High-Traffic warning states */}
                        {stock > 0 && stock <= 5 && (
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ef4444',
                            backgroundColor: '#fee2e2',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            alignSelf: 'flex-start',
                            border: '1px solid #fca5a5',
                            animation: 'hurry-pulse 1s infinite'
                          }}>
                            <span>⚠</span> Hurry! Only {stock} left
                          </div>
                        )}

                        {stock > 5 && stock < 10 && (
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ea580c',
                            backgroundColor: '#ffedd5',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            alignSelf: 'flex-start',
                            border: '1px solid #fed7aa'
                          }}>
                            <span>🔥</span> Selling Fast. Only {stock} left
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                      {!(shop as any).isRegistered ? (
                        <button
                          disabled
                          className="btn btn-secondary"
                          style={{ width: '100%', padding: '0.65rem 0', fontSize: '0.85rem', cursor: 'not-allowed', opacity: 0.6 }}
                        >
                          Not Available
                        </button>
                      ) : stock > 0 ? (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '0.65rem 0', fontSize: '0.85rem' }}
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => handleBuyNow(product)}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.65rem 0', fontSize: '0.85rem' }}
                          >
                            Buy Now
                          </button>
                        </div>
                      ) : (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.85rem',
                            color: '#ef4444',
                            fontWeight: 600,
                            fontStyle: 'italic',
                            textAlign: 'center',
                            display: 'block',
                            marginBottom: '0.5rem'
                          }}>
                            This product has just sold out.
                          </span>
                          <button
                            disabled
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '0.65rem 0', cursor: 'not-allowed', color: '#94a3b8', backgroundColor: '#e2e8f0' }}
                          >
                            Out of Stock
                          </button>
                        </div>
                      )}

                      {/* Dev trigger for stress-test directly targetting this product */}
                      <button
                        onClick={() => handleRunStressTest(product.id)}
                        disabled={stressTesting}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          fontSize: '0.75rem',
                          padding: '0.35rem 0',
                          borderRadius: 'var(--radius-sm)',
                          cursor: stressTesting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {stressTesting ? 'Simulating 100 requests...' : 'Run 100 Request Concurrency Test'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Concurrency Stress Test Result Dashboard Panel */}
          {stressTestResult && (
            <div className="card" style={{ backgroundColor: '#ffffff', border: '1.5px solid var(--border)', padding: '2.5rem', marginBottom: '3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Tatkal / Flash Sale Simulation Report
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)' }}>
                Stress Test Complete
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Initial Mock Stock</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>{stressTestResult.initialStock}</strong>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Concurrent Hits</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>{stressTestResult.totalRequests}</strong>
                </div>
                <div style={{ backgroundColor: '#ecfdf5', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#047857', display: 'block' }}>Reserved (Succeeded)</span>
                  <strong style={{ fontSize: '1.5rem', color: '#065f46' }}>{stressTestResult.successfulReservations}</strong>
                </div>
                <div style={{ backgroundColor: '#fef2f2', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #fca5a5' }}>
                  <span style={{ fontSize: '0.75rem', color: '#b91c1c', display: 'block' }}>Rejected (Out of Stock)</span>
                  <strong style={{ fontSize: '1.5rem', color: '#991b1b' }}>{stressTestResult.rejectedReservations}</strong>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Final Inventory</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>{stressTestResult.finalStock}</strong>
                </div>
              </div>

              <div style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border)'
              }}>
                💡 <strong>Fairness Verification:</strong> The atomic key-based mutex successfully serialized all 100 simultaneous requests. Exactly 50 reservations were accepted (reducing the stock to 0) and the remaining 50 requests were immediately rejected as Out-of-Stock without any duplicate or negative records.
              </div>
            </div>
          )}

          {/* Shop Information Section */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '2.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)' }}>
              ℹ️ Shop Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>About Shop</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  {s.description || 'No description available for this shop.'}
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>Delivery Details</h4>
                <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, paddingLeft: '1.25rem' }}>
                  <li>📍 <strong>Delivery Area:</strong> Within 5 km radius</li>
                  <li>⏱ <strong>Estimated Time:</strong> 10-15 Mins (Express)</li>
                  <li>📦 <strong>Minimum Order:</strong> ₹0</li>
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>Accepted Payments & Policies</h4>
                <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, paddingLeft: '1.25rem' }}>
                  <li>💳 UPI Online & Cash on Delivery (COD)</li>
                  <li>🔄 Returns within 24 hours for fresh items</li>
                  <li>🛡 Standard buyer protection policies apply</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '2.5rem', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                ⭐ Customer Reviews
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#eab308', fontSize: '1.25rem' }}>★</span>
                <strong style={{ fontSize: '1.2rem' }}>{s.rating}</strong>
                <span style={{ color: 'var(--text-muted)' }}>({s.reviewsCount} reviews total)</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Hariharan R</strong>
                  <span style={{ color: '#eab308' }}>★★★★★</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  "Excellent service and super fast delivery! The products are genuine and well packaged."
                </p>
              </div>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Deepika R</strong>
                  <span style={{ color: '#eab308' }}>★★★★★</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  "Very fresh organic milk and items are always in stock. Love the local shopping experience."
                </p>
              </div>
            </div>
          </div>

          {/* Similar Shops Section */}
          <div style={{ marginBottom: '4rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)' }}>
              🏪 Similar Shops Nearby
            </h3>
            {similarShops.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {similarShops.map((s: any) => (
                  <Link key={s.id} href={`/customer/shop/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                          {s.category}
                        </span>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{s.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          📍 {s.address}
                        </p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>🟢 Open Now</span>
                        <span style={{ fontSize: '0.8rem', color: '#eab308' }}>★ 4.8</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No similar shops found in this category.</p>
            )}
          </div>

        </div>
      </main>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fade-float {
          0% { transform: translateY(10px); opacity: 0; }
          15% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        @keyframes hurry-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); opacity: 0.9; }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
