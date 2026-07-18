import { NextResponse } from 'next/server';
import { getDistance } from '@/lib/overpass';
import { readCsv, SellerUser, ShopRecord } from '@/lib/csvDb';

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('id');

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    const geoapifyKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

    let business: any = null;

    if (googleKey) {
      console.log(`[DEBUG] Fetching Google Place details for ID: ${placeId}`);
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const place = data.result;
          const placeLat = place.geometry?.location?.lat;
          const placeLon = place.geometry?.location?.lng;
          const typeStr = (place.types && place.types.join(' ')) || '';
          business = {
            id: place.place_id,
            name: place.name,
            category: mapCategory(typeStr || 'Shop'),
            lat: placeLat,
            lon: placeLon,
            address: place.formatted_address || place.vicinity || 'Nearby Location',
            rating: place.rating || 4.2,
            reviewsCount: place.user_ratings_total || 25,
            isOpen: place.opening_hours ? place.opening_hours.open_now : true,
            photoUrl: place.photos && place.photos.length > 0 
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googleKey}`
              : undefined
          };
        }
      }
    }

    if (!business && geoapifyKey) {
      console.log(`[DEBUG] Fetching Geoapify Place details for ID: ${placeId}`);
      const url = `https://api.geoapify.com/v2/place-details?id=${placeId}&apiKey=${geoapifyKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          const categoriesStr = (props.categories && props.categories.join(' ')) || '';
          business = {
            id: props.place_id,
            name: props.name || 'Local Store',
            category: mapCategory(categoriesStr || 'Retail'),
            lat: props.lat,
            lon: props.lon,
            address: props.address_line2 || props.address_line1 || 'Nearby Location',
            rating: props.rating || 4.1,
            reviewsCount: props.reviews_count || 12,
            isOpen: true
          };
        }
      }
    }

    if (!business) {
      console.log(`[DEBUG] Falling back to mock details for ID: ${placeId}`);
      
      const mockTemplates = [
        {
          suffix: 'Corner Store',
          desc: 'Fresh daily products and groceries.',
          cat: 'Grocery Store',
          image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&auto=format&fit=crop&q=60'
        },
        {
          suffix: 'Central Bakery',
          desc: 'Warm baked croissants, breads, and premium fudge cakes.',
          cat: 'Bakery',
          image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60'
        },
        {
          suffix: 'Gourmet Bistro',
          desc: 'Signature burgers, classic pizzas, and hot coffee.',
          cat: 'Restaurant',
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=60'
        },
        {
          suffix: 'Wellness Pharmacy',
          desc: 'Over-the-counter medicines, vitamins, and first aid.',
          cat: 'Pharmacy',
          image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400&auto=format&fit=crop&q=60'
        },
        {
          suffix: 'Organic Greens & Veggies',
          desc: 'Freshly harvested local farm vegetables and fruits.',
          cat: 'Vegetables',
          image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60'
        }
      ];

      let hash = 0;
      for (let i = 0; i < placeId.length; i++) {
        hash = placeId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const idx = Math.abs(hash % mockTemplates.length);
      const template = mockTemplates[idx];

      business = {
        id: placeId,
        name: placeId.startsWith('ChIJ') ? `Real Business Fallback` : `Nexthood ${template.suffix}`,
        category: template.cat,
        lat: 12.9716 + (idx * 0.001),
        lon: 77.5946 - (idx * 0.001),
        address: `${Math.floor(10 + idx * 7)}, Neighborhood Link Rd, Near Main Crossing`,
        rating: 4.2 + (idx * 0.1),
        reviewsCount: 34 + (idx * 12),
        isOpen: true,
        photoUrl: template.image
      };
    }

    // Intercept with Registered Seller details from shops.csv
    let productsList: any[] = [];
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

      const matchedShop = shops.find(s => s.id === placeId || s.seller_id === placeId);

      if (matchedShop) {
        const open = checkIsOpen(matchedShop.opening_time || '09:00', matchedShop.closing_time || '21:00');
        
        // Fetch owner name and email from seller_users.csv
        let ownerName = 'Not Provided';
        let email = 'Not Provided';
        try {
          const sellers = await readCsv<SellerUser>('seller_users.csv', [
            'id', 'store_name', 'owner_name', 'email', 'mobile_number', 'password_hash', 'business_category',
            'gst_number', 'store_address', 'latitude', 'longitude', 'store_logo', 'created_at'
          ]);
          const sellerObj = sellers.find(s => s.id === matchedShop.seller_id);
          if (sellerObj) {
            ownerName = sellerObj.owner_name || 'Not Provided';
            email = sellerObj.email || 'Not Provided';
          }
        } catch (e) {
          console.error('[Details API] seller_users.csv lookup failed:', e);
        }

        business = {
          id: matchedShop.id,
          name: matchedShop.name,
          category: matchedShop.category,
          lat: parseFloat(matchedShop.latitude || '12.9229'),
          lon: parseFloat(matchedShop.longitude || '80.1275'),
          address: `${matchedShop.address || 'Not Available'}, ${matchedShop.city || ''}, ${matchedShop.state || ''} - ${matchedShop.pincode || ''}`,
          rating: '4.8', // verified dynamic partner default high rating
          reviewsCount: 126,
          isOpen: open,
          photoUrl: matchedShop.logo || undefined,
          isRegistered: true,
          verified: true,
          ownerName: ownerName,
          email: email,
          storeLogo: matchedShop.logo || undefined,
          description: matchedShop.description || 'Not Provided',
          openingHours: `${matchedShop.opening_time || '09:00'} - ${matchedShop.closing_time || '21:00'}`,
          pincode: matchedShop.pincode || 'Not Available',
          phone: matchedShop.phone_number || 'Not Provided',
          sellerId: matchedShop.seller_id,
          registeredSince: matchedShop.created_at ? new Date(matchedShop.created_at).toLocaleDateString() : 'Not Available'
        };

        // Load active products belonging to the matched seller
        try {
          const allProducts = await readCsv<any>('products.csv', [
            'id',
            'shop_id',
            'name',
            'category',
            'brand',
            'sku',
            'barcode',
            'description',
            'price',
            'mrp',
            'discount',
            'gst',
            'weight',
            'dimensions',
            'stock',
            'min_stock_alert',
            'supplier_name',
            'tags',
            'delivery_type',
            'images',
            'thumbnail_url',
            'views',
            'sold',
            'revenue',
            'rating',
            'created_at',
            'last_updated'
          ]);

          productsList = allProducts.filter(p => p.shop_id === matchedShop.seller_id);
        } catch (e) {
          console.error('[Details API] products.csv unreadable', e);
        }
      } else {
        // Check legacy seller_users.csv if needed
        try {
          const sellers = await readCsv<SellerUser>('seller_users.csv', [
            'id',
            'store_name',
            'owner_name',
            'email',
            'mobile_number',
            'password_hash',
            'business_category',
            'gst_number',
            'store_address',
            'latitude',
            'longitude',
            'store_logo',
            'created_at'
          ]);

          let matchedSeller = sellers.find(s => s.id === placeId);
          if (!matchedSeller && business) {
            matchedSeller = sellers.find(s => {
              const nameMatch = s.store_name.toLowerCase().trim() === business.name.toLowerCase().trim() ||
                                s.store_name.toLowerCase().trim().includes(business.name.toLowerCase().trim()) ||
                                business.name.toLowerCase().trim().includes(s.store_name.toLowerCase().trim());
              
              const latDiff = Math.abs(parseFloat(s.latitude || '0') - business.lat);
              const lonDiff = Math.abs(parseFloat(s.longitude || '0') - business.lon);
              const coordsMatch = latDiff < 0.001 && lonDiff < 0.001;

              return nameMatch || coordsMatch;
            });
          }

          if (matchedSeller) {
            business = {
              ...business,
              id: matchedSeller.id,
              name: matchedSeller.store_name,
              ownerName: matchedSeller.owner_name,
              category: matchedSeller.business_category,
              address: matchedSeller.store_address,
              lat: parseFloat(matchedSeller.latitude || '0') || (business ? business.lat : 12.9716),
              lon: parseFloat(matchedSeller.longitude || '0') || (business ? business.lon : 77.5946),
              photoUrl: matchedSeller.store_logo || (business ? business.photoUrl : undefined),
              isRegistered: true,
              verified: true,
              isOpen: true,
              rating: business ? business.rating : 4.8,
              reviewsCount: business ? business.reviewsCount : 45
            };

            const allProducts = await readCsv<any>('products.csv', [
              'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
              'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
              'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
              'created_at', 'last_updated'
            ]);
            productsList = allProducts.filter(p => p.shop_id === matchedSeller.id);
          } else {
            if (business) {
              business.isRegistered = false;
              business.verified = false;
            }
          }
        } catch (legacyErr) {
          console.warn('Legacy seller read error', legacyErr);
        }
      }
    } catch (csvError) {
      console.error('[CSV Match Details Error] Failed to read:', csvError);
    }

    return NextResponse.json({ success: true, business, products: productsList });
  } catch (error: any) {
    console.error('[ERROR] Places details endpoint failed:', error);
    return NextResponse.json({ error: 'Unable to load business details.' }, { status: 500 });
  }
}
