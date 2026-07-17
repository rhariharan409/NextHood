import { Business } from './overpass';

export interface CacheEntry {
  timestamp: number;
  data: Business[];
}

class BusinessSearchServiceClass {
  private cache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  private getCacheKey(lat: number, lon: number, keyword: string, radius: number): string {
    // Round lat/lon slightly to leverage cache for extremely close movements
    const roundedLat = lat.toFixed(4);
    const roundedLon = lon.toFixed(4);
    return `${roundedLat}_${roundedLon}_${keyword.toLowerCase().trim()}_${radius}`;
  }

  async search(lat: number, lon: number, keyword = '', radius = 5000): Promise<Business[]> {
    const key = this.getCacheKey(lat, lon, keyword, radius);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`[DEBUG] Retrieving nearby businesses from cache for key: ${key}`);
      return cached.data;
    }

    console.log(`[DEBUG] Cache miss. Fetching from Places API proxy. Key: ${key}`);
    
    const response = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, keyword, radius })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Places API proxy error: ${response.status}`);
    }

    const resData = await response.json();
    const results: Business[] = resData.businesses || [];

    // Store in cache
    this.cache.set(key, {
      timestamp: Date.now(),
      data: results
    });

    return results;
  }

  clearCache() {
    this.cache.clear();
    console.log('[DEBUG] BusinessSearchService cache cleared.');
  }
}

export const BusinessSearchService = new BusinessSearchServiceClass();
export type { Business };
