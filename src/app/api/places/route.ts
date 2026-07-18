import { NextResponse } from 'next/server';
import { getDistance, Business } from '@/lib/overpass';
import { readCsv, ShopRecord } from '@/lib/csvDb';

function mapCategory(googleCategory: string): string {
  const cat = googleCategory.toLowerCase();
  if (cat.includes('bakery') || cat.includes('cake') || cat.includes('confectionery') || cat.includes('sweet')) {
    return 'Bakery';
  }
  if (cat.includes('pharmacy') || cat.includes('medicine') || cat.includes('chemist') || cat.includes('drugstore') || cat.includes('health') || cat.includes('medical')) {
    return 'Pharmacy';
  }
  if (cat.includes('electronic') || cat.includes('mobile') || cat.includes('tech') || cat.includes('computer') || cat.includes('phone') || cat.includes('appliance')) {
    return 'Electronics';
  }
  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea') || cat.includes('bistro') || cat.includes('dine') || cat.includes('eat') || cat.includes('meal')) {
    return 'Restaurant';
  }
  if (cat.includes('grocery') || cat.includes('supermarket') || cat.includes('convenience') || cat.includes('store') || cat.includes('shop') || cat.includes('market') || cat.includes('vegetable') || cat.includes('fruit') || cat.includes('green') || cat.includes('veg')) {
    return 'Grocery Store';
  }
  return 'Grocery Store'; // Default fallback
}

const checkIsOpen = (openTime: string, closeTime: string) => {
  try {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeVal = currentHours * 60 + currentMinutes;

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openTimeVal = openH * 60 + openM;
    const closeTimeVal = closeH * 60 + closeM;

    return currentTimeVal >= openTimeVal && currentTimeVal <= closeTimeVal;
  } catch {
    return true;
  }
};

export async function POST(req: Request) {
  try {
    const { lat, lon, keyword, radius } = await req.json();

    if (lat === undefined || lon === undefined) {
      return NextResponse.json({ error: 'Coordinates are required' }, { status: 400 });
    }

    const searchKeyword = (keyword || '').toLowerCase().trim();
    const searchRadius = radius || 5000;

    const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    const geoapifyKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

    let apiBusinesses: Business[] = [];

    if (googleKey) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${searchRadius}&keyword=${encodeURIComponent(searchKeyword)}&key=${googleKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          apiBusinesses = data.results.map((place: any) => {
            const placeLat = place.geometry.location.lat;
            const placeLon = place.geometry.location.lng;
            const typeStr = (place.types && place.types.join(' ')) || '';
            return {
              id: place.place_id,
              name: place.name,
              category: mapCategory(typeStr || searchKeyword || 'Shop'),
              lat: placeLat,
              lon: placeLon,
              address: place.vicinity || 'Nearby Location',
              distance: getDistance(lat, lon, placeLat, placeLon),
              rating: place.rating || 4.2,
              reviewsCount: place.user_ratings_total || 25,
              isOpen: place.opening_hours ? place.opening_hours.open_now : true,
              photoUrl: place.photos && place.photos.length > 0 
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googleKey}`
                : undefined
            };
          });
        }
      }
    } else if (geoapifyKey) {
      let categoryFilter = 'commercial.shopping';
      if (searchKeyword.includes('restaurant') || searchKeyword.includes('food')) {
        categoryFilter = 'catering.restaurant';
      } else if (searchKeyword.includes('cafe') || searchKeyword.includes('coffee')) {
        categoryFilter = 'catering.cafe';
      } else if (searchKeyword.includes('bakery') || searchKeyword.includes('cake')) {
        categoryFilter = 'catering.cafe,commercial.shopping.bakery';
      } else if (searchKeyword.includes('pharmacy') || searchKeyword.includes('medicine')) {
        categoryFilter = 'healthcare.pharmacy';
      } else if (searchKeyword.includes('grocery') || searchKeyword.includes('supermarket') || searchKeyword.includes('vegetable')) {
        categoryFilter = 'commercial.shopping.supermarket,commercial.shopping.grocery';
      }

      const url = `https://api.geoapify.com/v2/places?categories=${categoryFilter}&filter=circle:${lon},${lat},${searchRadius}&bias=proximity:${lon},${lat}&limit=30&apiKey=${geoapifyKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features) {
          apiBusinesses = data.features.map((feature: any) => {
            const props = feature.properties || {};
            const placeLat = props.lat;
            const placeLon = props.lon;
            const categoriesStr = (props.categories && props.categories.join(' ')) || '';
            return {
              id: props.place_id,
              name: props.name || 'Local Store',
              category: mapCategory(categoriesStr || searchKeyword || 'Retail'),
              lat: placeLat,
              lon: placeLon,
              address: props.address_line2 || props.address_line1 || 'Nearby Location',
              distance: getDistance(lat, lon, placeLat, placeLon),
              rating: props.rating || 4.1,
              reviewsCount: props.reviews_count || 12,
              isOpen: true
            };
          });
        }
      }
    }

    // Static Mock Fallback templates (always returned as baseline static shops alongside DB)
    const mockTemplates = [
      {
        suffix: 'Corner Store',
        offsetLat: 0.0034,
        offsetLon: -0.0041,
        desc: 'Fresh daily products and groceries.',
        cat: 'Grocery Store',
        image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&auto=format&fit=crop&q=60'
      },
      {
        suffix: 'Central Bakery',
        offsetLat: -0.0021,
        offsetLon: 0.0035,
        desc: 'Warm baked croissants, breads, and premium fudge cakes.',
        cat: 'Bakery',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60'
      },
      {
        suffix: 'Gourmet Bistro',
        offsetLat: 0.0055,
        offsetLon: 0.0062,
        desc: 'Signature burgers, classic pizzas, and hot coffee.',
        cat: 'Restaurant',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=60'
      },
      {
        suffix: 'Wellness Pharmacy',
        offsetLat: -0.0048,
        offsetLon: -0.0032,
        desc: 'Over-the-counter medicines, vitamins, and first aid.',
        cat: 'Pharmacy',
        image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400&auto=format&fit=crop&q=60'
      },
      {
        suffix: 'Organic Greens & Veggies',
        offsetLat: 0.0012,
        offsetLon: -0.0058,
        desc: 'Freshly harvested local farm vegetables and fruits.',
        cat: 'Grocery Store',
        image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60'
      }
    ];

    const matchedTemplates = searchKeyword
      ? mockTemplates.filter(t => t.cat.toLowerCase().includes(searchKeyword) || t.suffix.toLowerCase().includes(searchKeyword))
      : mockTemplates;

    const staticBusinesses = matchedTemplates.map((item, idx) => {
      const placeLat = lat + item.offsetLat;
      const placeLon = lon + item.offsetLon;
      const mockShopId = `392817290${idx + 1}`;
      
      return {
        id: mockShopId,
        name: `Nexthood ${item.suffix}`,
        category: item.cat,
        lat: placeLat,
        lon: placeLon,
        address: `${Math.floor(10 + idx * 7)}, Neighborhood Link Rd, Near Main Crossing`,
        distance: getDistance(lat, lon, placeLat, placeLon),
        rating: 4.2 + (idx * 0.1),
        reviewsCount: 34 + (idx * 12),
        isOpen: true,
        photoUrl: item.image,
        isRegistered: false,
        verified: false
      };
    });

    // 4. Fetch dynamic registered shops from shops.csv database
    let dbBusinesses: Business[] = [];
    try {
      const shops = await readCsv<ShopRecord>('shops.csv', [
        'id',
        'seller_id',
        'name',
        'category',
        'description',
        'address',
        'city',
        'state',
        'pincode',
        'latitude',
        'longitude',
        'phone_number',
        'opening_time',
        'closing_time',
        'logo',
        'status',
        'created_at'
      ]);

      // Parse product tags/names to match keyword search
      let matchingShopIds: Set<string> = new Set();
      if (searchKeyword) {
        try {
          const products = await readCsv<any>('products.csv', ['shop_id', 'name', 'description', 'tags', 'category']);
          products.forEach(p => {
            const matches = (p.name || '').toLowerCase().includes(searchKeyword) ||
                            (p.description || '').toLowerCase().includes(searchKeyword) ||
                            (p.tags || '').toLowerCase().includes(searchKeyword) ||
                            (p.category || '').toLowerCase().includes(searchKeyword);
            if (matches) {
              matchingShopIds.add(p.shop_id);
            }
          });
        } catch (e) {
          console.error('[Error reading products in places]', e);
        }
      }

      const filteredShops = shops.filter(shop => {
        if (shop.status === 'Inactive') return false;
        if (searchKeyword) {
          const nameMatch = shop.name.toLowerCase().includes(searchKeyword) ||
                            shop.category.toLowerCase().includes(searchKeyword) ||
                            shop.description.toLowerCase().includes(searchKeyword);
          const productMatch = matchingShopIds.has(shop.seller_id);
          return nameMatch || productMatch;
        }
        return true;
      });

      dbBusinesses = filteredShops.map(shop => {
        const shopLat = parseFloat(shop.latitude || '12.9229');
        const shopLon = parseFloat(shop.longitude || '80.1275');
        const dist = getDistance(lat, lon, shopLat, shopLon);
        const open = checkIsOpen(shop.opening_time || '09:00', shop.closing_time || '21:00');

        return {
          id: shop.id,
          name: shop.name,
          category: shop.category,
          lat: shopLat,
          lon: shopLon,
          address: `${shop.address}, ${shop.city}, ${shop.state} - ${shop.pincode}`,
          distance: dist,
          rating: 'New Store',
          reviewsCount: 0,
          isOpen: open,
          photoUrl: shop.logo || undefined,
          isRegistered: true,
          verified: true,
          ownerName: shop.name,
          storeLogo: shop.logo,
          description: shop.description,
          openingHours: `${shop.opening_time} - ${shop.closing_time}`,
          pincode: shop.pincode,
          phone: shop.phone_number,
          sellerId: shop.seller_id
        };
      });

    } catch (e) {
      console.warn('[Places API] shops.csv not found or unreadable yet:', e);
    }

    // Combine third-party API results OR fallback static mock templates, and database registered shops
    const baseline = apiBusinesses.length > 0 ? apiBusinesses : staticBusinesses;
    
    // De-duplicate baseline with database shops if they represent the same place
    const finalBusinesses = [...dbBusinesses];
    baseline.forEach(b => {
      const duplicate = dbBusinesses.some(dbb => dbb.name.toLowerCase().trim() === b.name.toLowerCase().trim() || 
        (Math.abs(dbb.lat - b.lat) < 0.0005 && Math.abs(dbb.lon - b.lon) < 0.0005)
      );
      if (!duplicate) {
        finalBusinesses.push(b);
      }
    });

    return NextResponse.json({ success: true, businesses: finalBusinesses });
  } catch (error: any) {
    console.error('[ERROR] Places proxy endpoint failed:', error);
    return NextResponse.json({ error: 'Unable to load nearby businesses. Please try again.' }, { status: 500 });
  }
}


