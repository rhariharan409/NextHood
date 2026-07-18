export interface Business {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address: string;
  distance: number; // in meters
  rating: number | string;
  reviewsCount: number;
  isOpen: boolean;
  photoUrl?: string;
  isRegistered?: boolean;
  openingHours?: string;
}

// Haversine formula to calculate distance between two coordinates in meters
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Generate a deterministic rating & reviews based on the OSM ID to look premium
function getDeterministicStats(id: string | number) {
  const idStr = String(id);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Rating between 3.8 and 5.0
  const rating = 3.8 + Math.abs((hash % 13) / 10);
  // Reviews count between 5 and 250
  const reviewsCount = 5 + Math.abs(hash % 245);
  // Deterministic open/closed status (e.g. 70% chance open)
  const isOpen = Math.abs(hash % 10) < 7;
  
  // Deterministic category illustration image (Unsplash free unsized URLs for categories)
  const categories = ['food', 'shopping', 'health', 'daily'];
  const cat = categories[Math.abs(hash % categories.length)];
  let photoUrl = '';
  if (cat === 'food') {
    photoUrl = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=60';
  } else if (cat === 'shopping') {
    photoUrl = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=60';
  } else if (cat === 'health') {
    photoUrl = 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400&auto=format&fit=crop&q=60';
  } else {
    photoUrl = 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&auto=format&fit=crop&q=60';
  }

  return {
    rating: parseFloat(rating.toFixed(1)),
    reviewsCount,
    isOpen,
    photoUrl
  };
}

// Map common user queries to Overpass tags
function getOverpassQueryFilters(keyword: string): string[] {
  const kw = keyword.toLowerCase().trim();
  if (!kw) {
    return [
      `node["shop"]`,
      `node["amenity"~"restaurant|cafe|pharmacy|fast_food|bar|supermarket"]`,
      `way["shop"]`,
      `way["amenity"~"restaurant|cafe|pharmacy|fast_food|bar|supermarket"]`
    ];
  }

  // Define keyword filters
  if (kw.includes('cake') || kw.includes('bakery') || kw.includes('bake')) {
    return [`node["shop"="bakery"]`, `node["shop"="confectionery"]`, `way["shop"="bakery"]`];
  }
  if (kw.includes('restaurant') || kw.includes('food') || kw.includes('dine') || kw.includes('eat')) {
    return [`node["amenity"="restaurant"]`, `node["amenity"="fast_food"]`, `way["amenity"="restaurant"]`];
  }
  if (kw.includes('cafe') || kw.includes('coffee') || kw.includes('tea')) {
    return [`node["amenity"="cafe"]`, `way["amenity"="cafe"]`];
  }
  if (kw.includes('pharmacy') || kw.includes('medicine') || kw.includes('chemist') || kw.includes('drugstore')) {
    return [`node["amenity"="pharmacy"]`, `way["amenity"="pharmacy"]`];
  }
  if (kw.includes('vegetable') || kw.includes('fruit') || kw.includes('green') || kw.includes('veg')) {
    return [`node["shop"="greengrocer"]`, `node["shop"="supermarket"]`, `way["shop"="greengrocer"]`];
  }
  if (kw.includes('electronic') || kw.includes('mobile') || kw.includes('tech') || kw.includes('phone') || kw.includes('computer')) {
    return [`node["shop"="electronics"]`, `node["shop"="mobile_phone"]`, `way["shop"="electronics"]`];
  }
  if (kw.includes('book') || kw.includes('stationery') || kw.includes('read')) {
    return [`node["shop"="books"]`, `node["shop"="stationery"]`, `way["shop"="books"]`];
  }
  if (kw.includes('grocery') || kw.includes('supermarket') || kw.includes('convenience') || kw.includes('store') || kw.includes('shop')) {
    return [`node["shop"~"supermarket|convenience|grocery|general"]`, `way["shop"~"supermarket|convenience|grocery|general"]`];
  }

  // Fallback: search tags matching name or general shop/amenity
  return [
    `node["shop"][name~"${keyword}",i]`,
    `node["amenity"][name~"${keyword}",i]`,
    `way["shop"][name~"${keyword}",i]`,
    `way["amenity"][name~"${keyword}",i]`,
    // General fallback
    `node["shop"]`,
    `node["amenity"~"restaurant|cafe|pharmacy"]`
  ];
}

const CATEGORIZED_KEYWORDS = [
  'cake', 'bakery', 'bake',
  'restaurant', 'food', 'dine', 'eat',
  'cafe', 'coffee', 'tea',
  'pharmacy', 'medicine', 'chemist', 'drugstore',
  'vegetable', 'fruit', 'green', 'veg',
  'electronic', 'mobile', 'tech', 'phone', 'computer',
  'book', 'stationery', 'read',
  'grocery', 'supermarket', 'convenience', 'store', 'shop'
];

export async function fetchNearbyBusinesses(
  lat: number,
  lon: number,
  keyword = '',
  radius = 5000 // default radius is now at least 5000m
): Promise<Business[]> {
  console.log(`[DEBUG] fetchNearbyBusinesses called with: Lat=${lat}, Lon=${lon}, Keyword="${keyword}", Radius=${radius}m`);

  const filters = getOverpassQueryFilters(keyword);
  
  // Construct Overpass QL query
  const queryClauses = filters.map(f => `${f}(around:${radius},${lat},${lon});`).join('\n');
  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${queryClauses}
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
  console.log(`[DEBUG] Overpass API request URL: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DEBUG] Overpass API error response:`, errorText);
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}. details: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[DEBUG] Overpass API response elements count:`, data.elements ? data.elements.length : 0);
    console.log(`[DEBUG] Complete API response:`, data);

    if (!data.elements) return [];

    const businesses: Business[] = data.elements
      .map((el: any) => {
        const id = String(el.id);
        const tags = el.tags || {};
        const name = tags.name || tags.brand || 'Local Business';
        
        // Skip elements with no clear business name unless it is an interesting shop
        if (name === 'Local Business' && !tags.shop && !tags.amenity) {
          return null;
        }

        // Get coordinates (nodes have lat/lon, ways have center lat/lon)
        const businessLat = el.lat || (el.center && el.center.lat);
        const businessLon = el.lon || (el.center && el.center.lon);

        if (!businessLat || !businessLon) return null;

        // Determine category display
        let category = 'Local Shop';
        if (tags.shop) {
          category = tags.shop.replace(/_/g, ' ');
          category = category.charAt(0).toUpperCase() + category.slice(1);
        } else if (tags.amenity) {
          category = tags.amenity.replace(/_/g, ' ');
          category = category.charAt(0).toUpperCase() + category.slice(1);
        }

        // Address construction
        const street = tags['addr:street'] || '';
        const houseNumber = tags['addr:housenumber'] || '';
        const city = tags['addr:city'] || '';
        const postcode = tags['addr:postcode'] || '';
        
        let address = '';
        if (street) {
          address = `${houseNumber ? houseNumber + ' ' : ''}${street}`;
          if (city) address += `, ${city}`;
        } else {
          address = tags['addr:full'] || tags.address || 'Address on request';
        }

        const distance = getDistance(lat, lon, businessLat, businessLon);
        const { rating, reviewsCount, isOpen, photoUrl } = getDeterministicStats(id);

        return {
          id,
          name,
          category,
          lat: businessLat,
          lon: businessLon,
          address,
          distance,
          rating,
          reviewsCount,
          isOpen,
          photoUrl
        };
      })
      .filter((b: any): b is Business => b !== null);

    // Filter results if keyword is not a predefined categorized tag
    const cleanKeyword = keyword.toLowerCase().trim();
    const isPredefinedCategory = CATEGORIZED_KEYWORDS.some(k => cleanKeyword.includes(k));

    if (cleanKeyword && !isPredefinedCategory) {
      return businesses
        .filter(b => 
          b.name.toLowerCase().includes(cleanKeyword) || 
          b.category.toLowerCase().includes(cleanKeyword)
        )
        .sort((a, b) => a.distance - b.distance);
    }

    // Sort by proximity
    return businesses.sort((a, b) => a.distance - b.distance);
  } catch (error: any) {
    console.error('Error fetching data from Overpass API:', error);
    throw error; // throw error so the UI can capture and display the exact error message
  }
}
