import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readCsv, writeCsv, appendCsv, SellerUser } from '@/lib/csvDb';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

interface ProductRecord {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  mrp: string;
  discount: string;
  gst: string;
  weight: string;
  dimensions: string;
  stock: string;
  min_stock_alert: string;
  supplier_name: string;
  tags: string;
  delivery_type: string;
  images: string;
  thumbnail_url?: string;
  views: string;
  sold: string;
  revenue: string;
  rating: string;
  created_at: string;
  last_updated: string;
}

const PRODUCT_COLUMNS: (keyof ProductRecord)[] = [
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
];

function buildIntelligentSearchQuery(productName: string, category: string): string {
  const name = productName.trim().toLowerCase();
  const cat = category.toLowerCase();
  
  if (name === 'toothpaste') {
    return 'Colgate toothpaste tube product pack isolated white background';
  }
  if (name === 'soap') {
    return 'Lux soap bar product';
  }
  if (name === 'cake') {
    return 'Chocolate cake product';
  }
  if (name === 'rice') {
    return 'Basmati rice 1kg bag';
  }
  if (name === 'milk') {
    return 'Milk packet product';
  }

  // General expansion rules
  if (name.includes('toothpaste')) {
    return `${productName} tube product pack isolated white background`;
  }
  if (name.includes('soap')) {
    return `${productName} bar product isolated white background`;
  }
  if (name.includes('cake') || name.includes('cupcake') || name.includes('donut')) {
    return `${productName} product isolated white background`;
  }
  if (name.includes('rice') || name.includes('dal') || name.includes('wheat') || name.includes('flour')) {
    return `${productName} bag product isolated white background`;
  }
  if (name.includes('milk') || name.includes('curd') || name.includes('yogurt') || name.includes('juice')) {
    return `${productName} packet bottle product isolated white background`;
  }
  if (cat.includes('pharmacy') || cat.includes('medicine') || name.includes('tablet') || name.includes('vitamin') || name.includes('paracetamol')) {
    return `${productName} medicine pack box product isolated white background`;
  }
  if (cat.includes('electronic') || cat.includes('mobile') || name.includes('headphone') || name.includes('keyboard') || name.includes('mouse')) {
    return `${productName} device product isolated white background`;
  }
  if (cat.includes('restaurant') || cat.includes('food') || name.includes('burger') || name.includes('pizza') || name.includes('salad')) {
    return `${productName} dish food product isolated white background`;
  }

  // Default query builder
  return `${productName} retail pack product isolated white background`;
}

interface SearchCandidate {
  url: string;
  title: string;
  snippet?: string;
}

function selectBestProductImage(candidates: SearchCandidate[]): string | null {
  const rejectedKeywords = [
    'face', 'person', 'people', 'man', 'woman', 'girl', 'boy', 'human', 'hand', 'arm',
    'bathroom', 'kitchen', 'restaurant', 'landscape', 'scenery', 'outdoor', 'scenic',
    'advertisement', 'poster', 'banner', 'logo only', 'logo', 'watermark', 'cooking',
    'eating', 'dining', 'table setup', 'room'
  ];

  const positiveKeywords = [
    'pack', 'package', 'box', 'bottle', 'isolated', 'white background', 'white-bg',
    'transparent', 'png', 'product', 'amazon', 'flipkart', 'instamart', 'blinkit',
    'front-facing', 'centered', 'single'
  ];

  let bestUrl: string | null = null;
  let highestScore = -9999;

  for (const item of candidates) {
    const url = item.url.toLowerCase();
    const title = item.title.toLowerCase();
    const snippet = (item.snippet || '').toLowerCase();
    const contentText = `${title} ${snippet} ${url}`;

    let score = 100;

    // 1. Check for strict rejects
    let isRejected = false;
    for (const kw of rejectedKeywords) {
      if (contentText.includes(kw)) {
        isRejected = true;
        break;
      }
    }
    if (isRejected) {
      continue;
    }

    // 2. Score positive attributes
    for (const kw of positiveKeywords) {
      if (contentText.includes(kw)) {
        score += 15;
      }
    }

    // Prefer high resolution extensions
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      score += 10;
    }

    if (score > highestScore) {
      highestScore = score;
      bestUrl = item.url;
    }
  }

  return bestUrl;
}

interface ImageCacheRecord {
  product_name: string;
  image_url: string;
  image_source: string;
  timestamp: string;
  verification_status: string;
}

async function generateGeminiQuery(productName: string, category: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!geminiKey) {
    return buildIntelligentSearchQuery(productName, category);
  }

  const prompt = `You are a helpful product image search query builder for a grocery and e-commerce store. 
Given a product name and its category, output ONLY the best possible search query that can be used on Google Images/Bing Images to find a clean product packaging photo.
The output query must target a single product, centered, on a white or transparent background, front-facing, with no people, logos only, or watermarks.
Your output must contain ONLY the query string, without quotes or additional text.

Examples:
Input: Toothpaste
Output: Colgate toothpaste tube product packaging isolated white background front view

Input: Milk
Output: Amul milk packet 1 litre product packaging

Input: Soap
Output: Lux soap bar packaging isolated white background

Input: ${productName} (Category: ${category})
Output:`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.trim()) {
        return text.trim();
      }
    }
  } catch (err) {
    console.error('[GEMINI QUERY] Fetch failed:', err);
  }

  return buildIntelligentSearchQuery(productName, category);
}

// ==========================================
// E-COMMERCE PRODUCT IMAGE PIPELINE
// ==========================================

function normalizeProductNameForLocal(name: string): string {
  let normalized = name.toLowerCase().trim();

  // 1. Remove quantities/units (e.g. 500ml, 1l, 150g, 1kg, pack of 12)
  normalized = normalized.replace(/\b\d+(\s*)(l|ml|g|kg|pcs|pack|pack of \d+|tablets|tablet)\b/gi, '');
  
  // 2. Remove common brand names
  const brands = [
    'amul', 'aavin', 'colgate', 'lux', 'britannia', 'parle g', 'parle-g', 'parle',
    'nestle', 'cadbury', 'pepsi', 'coca cola', 'coca-cola', 'coke', 'bisleri', 'aquafina',
    'kinley', 'dove', 'pepsodent', 'sensodyne', 'dettol', 'lifebuoy', 'pears', 'fiama',
    'savlon', 'himalaya', 'nivea', 'ponds', 'garnier', 'loreal', 'head & shoulders',
    'pantene', 'sunsilk', 'clinic plus', 'tata', 'ashirvaad', 'fortune', 'dhara', 'safal',
    'mother dairy', 'kwality walls', 'havmor', 'arun', 'heritage', 'milky mist', 'amrutanjan',
    'vicks', 'dano', 'horlicks', 'boost', 'complan', 'bournvita', 'lays', 'amul gold', 'aavin toned',
    'britannia good day', 'dairy milk silk'
  ];

  for (const brand of brands) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // 3. Remove packaging/extra descriptive terms
  const descriptiveTerms = [
    'gold', 'toned', 'strong', 'teeth', 'rose', 'magic', 'masala', 'silk', 'packet', 'pouch',
    'box', 'carton', 'bottle', 'can', 'fresh', 'organic', 'local', 'premium', 'healthy', 'classic',
    'super', 'natural', 'pure', 'sweet', 'salted', 'spicy'
  ];
  for (const term of descriptiveTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // 4. Remove punctuation
  normalized = normalized.replace(/[^\w\s]/g, '');

  // 5. Clean extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // 6. Map to core item names (Smart Category Matching & Synonym mapping)
  if (normalized.includes('milk')) return 'milk';
  if (normalized.includes('rice')) return 'rice';
  if (normalized.includes('toothpaste') || normalized.includes('oral care') || normalized.includes('tooth paste')) return 'toothpaste';
  if (normalized.includes('soap') || normalized.includes('personal care')) return 'soap';
  if (normalized.includes('cake') || normalized.includes('bakery')) return 'cake';
  if (normalized.includes('chocolate')) return 'chocolate';
  if (normalized.includes('biscuit') || normalized.includes('good day') || normalized.includes('cookies')) return 'biscuit';
  if (normalized.includes('shampoo') || normalized.includes('hair care')) return 'shampoo';
  if (normalized.includes('vegetable') || normalized.includes('fruit') || normalized.includes('produce')) return 'vegetables';
  if (normalized.includes('bread')) return 'bread';
  if (normalized.includes('oil')) return 'oil';
  if (normalized.includes('juice') || normalized.includes('drink') || normalized.includes('soda')) return 'beverages';
  if (normalized.includes('curd') || normalized.includes('yogurt')) return 'curd';
  if (normalized.includes('butter')) return 'butter';

  return normalized;
}

function findLocalImage(normalizedName: string): string | null {
  const imagesDir = path.join(process.cwd(), 'public', 'product-images');
  if (!fs.existsSync(imagesDir)) {
    return null;
  }

  // Map of normalized name to folder name / synonyms
  const folderMapping: Record<string, string[]> = {
    'milk': ['Milk', 'Dairy'],
    'rice': ['Rice'],
    'toothpaste': ['Toothpaste', 'Oral Care'],
    'soap': ['Soap', 'Personal Care'],
    'cake': ['Cake', 'Bakery'],
    'chocolate': ['Chocolate'],
    'biscuit': ['Biscuit', 'Biscuits', 'Bakery'],
    'shampoo': ['Shampoo', 'Hair Care'],
    'vegetables': ['Vegetables', 'Fresh Produce', 'Fruits'],
    'bread': ['Bread', 'Bakery'],
    'oil': ['Oil'],
    'beverages': ['Beverages', 'Juice', 'Soft Drinks'],
    'curd': ['Curd', 'Dairy'],
    'butter': ['Butter', 'Dairy']
  };

  const candidateFolders = folderMapping[normalizedName] || [normalizedName];

  for (const folder of candidateFolders) {
    const folderPath = path.join(imagesDir, folder);
    if (fs.existsSync(folderPath)) {
      try {
        const files = fs.readdirSync(folderPath).filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        });
        if (files.length > 0) {
          const randomFile = files[Math.floor(Math.random() * files.length)];
          return `/product-images/${folder}/${randomFile}`;
        }
      } catch (e) {
        console.error('Error scanning folder:', folder, e);
      }
    }
  }

  return null;
}

async function downloadAndSaveImage(imageUrl: string, folderName: string, prefix: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const cleanFolder = folderName.replace(/[^\w]/g, '_');
      const dirPath = path.join(process.cwd(), 'public', 'product-images', cleanFolder);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const ext = path.extname(new URL(imageUrl).pathname).toLowerCase() || '.jpg';
      const fileName = `${prefix}_${Date.now()}${ext}`;
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, buffer);
      return `/product-images/${cleanFolder}/${fileName}`;
    }
  } catch (e) {
    console.error('[IMAGE DOWNLOAD] Failed to download image:', imageUrl, e);
  }
  return null;
}

async function saveToCache(productName: string, imageUrl: string, source: string) {
  try {
    const newRecord: ImageCacheRecord = {
      product_name: productName.trim(),
      image_url: imageUrl,
      image_source: source,
      timestamp: new Date().toISOString(),
      verification_status: 'verified'
    };
    await appendCsv<ImageCacheRecord>('image_cache.csv', [
      'product_name',
      'image_url',
      'image_source',
      'timestamp',
      'verification_status'
    ], newRecord);
  } catch (err) {
    console.error('[IMAGE CACHE] Failed to write cache record:', err);
  }
}

async function autoGetImageUrl(productName: string, category: string): Promise<{ url: string; source: string }> {
  const cleanName = productName.trim();
  
  // Cache check first
  try {
    const cache = await readCsv<ImageCacheRecord>('image_cache.csv', [
      'product_name',
      'image_url',
      'image_source',
      'timestamp',
      'verification_status'
    ]);
    const matched = cache.find(r => r.product_name.toLowerCase().trim() === cleanName.toLowerCase());
    if (matched && matched.image_url) {
      console.log(`[IMAGE CACHE] Reused cached image for "${cleanName}":`, matched.image_url);
      return { url: matched.image_url, source: matched.image_source };
    }
  } catch (err) {
    console.log('[IMAGE CACHE] Cache file not initialized or read failed.');
  }

  // STEP 1 (Highest Priority): Local Product Image Folder (/public/product-images/)
  const normalized = normalizeProductNameForLocal(cleanName);
  const localImg = findLocalImage(normalized);
  if (localImg) {
    console.log(`[PIPELINE] STEP 1 Local Image Found:`, localImg);
    const source = 'Local Folder';
    await saveToCache(cleanName, localImg, source);
    return { url: localImg, source };
  }

  // STEP 2: OpenFoodFacts API (Only for Groceries/Food Items)
  const isFoodOrGroceries = [
    'milk', 'bread', 'rice', 'chocolate', 'biscuit', 'curd', 'butter', 'oil',
    'beverages', 'grocery', 'food', 'chips', 'snacks'
  ].includes(normalized);

  if (isFoodOrGroceries) {
    try {
      console.log(`[PIPELINE] STEP 2 Querying OpenFoodFacts for: "${cleanName}"`);
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanName)}&search_simple=1&action=process&json=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          const match = data.products.find((p: any) => p.image_url);
          if (match && match.image_url) {
            console.log(`[PIPELINE] STEP 2 OpenFoodFacts Image Found:`, match.image_url);
            const localPath = await downloadAndSaveImage(match.image_url, normalized, 'off');
            if (localPath) {
              const source = 'OpenFoodFacts';
              await saveToCache(cleanName, localPath, source);
              return { url: localPath, source };
            }
          }
        }
      }
    } catch (e) {
      console.error('[PIPELINE] OpenFoodFacts error:', e);
    }
  }

  // STEP 3: Google Custom Search API
  const query = `${cleanName} ${category} product`;
  const googleKey = process.env.GOOGLE_SEARCH_KEY || process.env.GOOGLE_API_KEY;
  const googleCx = process.env.GOOGLE_CX;
  const bingKey = process.env.BING_SEARCH_KEY || process.env.BING_API_KEY;

  let candidates: SearchCandidate[] = [];

  if (googleKey && googleCx) {
    try {
      console.log(`[PIPELINE] STEP 3 Searching Google Custom Search for: "${query}"`);
      const res1 = await fetch(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&key=${googleKey}&cx=${googleCx}&num=10&start=1`);
      if (res1.ok) {
        const data1 = await res1.json();
        if (data1.items) {
          candidates.push(...data1.items.map((item: any) => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet,
            width: item.image?.width,
            height: item.image?.height
          })));
        }
      }
      const res2 = await fetch(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&key=${googleKey}&cx=${googleCx}&num=10&start=11`);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.items) {
          candidates.push(...data2.items.map((item: any) => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet,
            width: item.image?.width,
            height: item.image?.height
          })));
        }
      }
    } catch (e) {
      console.error('[PIPELINE] Google search API error:', e);
    }
  }

  // STEP 4: Bing Image Search API
  if (candidates.length === 0 && bingKey) {
    try {
      console.log(`[PIPELINE] STEP 4 Searching Bing Image Search for: "${query}"`);
      const res = await fetch(`https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query)}&count=20`, {
        headers: { 'Ocp-Apim-Subscription-Key': bingKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.value && data.value.length > 0) {
          candidates = data.value.map((item: any) => ({
            url: item.contentUrl,
            title: item.name,
            snippet: item.hostPageDisplayUrl,
            width: item.width,
            height: item.height
          }));
        }
      }
    } catch (e) {
      console.error('[PIPELINE] Bing Search API error:', e);
    }
  }

  // Filter & score candidates
  if (candidates.length > 0) {
    const selectedUrl = selectBestProductImage(candidates);
    if (selectedUrl) {
      console.log(`[PIPELINE] Selected best candidate:`, selectedUrl);
      const localPath = await downloadAndSaveImage(selectedUrl, normalized, googleKey && googleCx ? 'google' : 'bing');
      if (localPath) {
        const source = googleKey && googleCx ? 'Google Custom Search' : 'Bing Image Search';
        await saveToCache(cleanName, localPath, source);
        return { url: localPath, source };
      }
    }
  }

  // STEP 5: Category Placeholder Fallbacks
  const cat = category.toLowerCase();
  let fallbackUrl = '';
  let fallbackSource = 'Placeholder Fallback';

  if (cat.includes('bakery') || cat.includes('cake') || cat.includes('confectionery')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400';
    fallbackSource = 'Bakery Placeholder';
  } else if (cat.includes('pharmacy') || cat.includes('medicine') || cat.includes('health') || cat.includes('medical')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400';
    fallbackSource = 'Medicine Placeholder';
  } else if (cat.includes('electronic') || cat.includes('mobile') || cat.includes('tech')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
    fallbackSource = 'Electronics Placeholder';
  } else if (cat.includes('vegetable') || cat.includes('fruit') || cat.includes('produce')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400';
    fallbackSource = 'Vegetable Placeholder';
  } else if (cat.includes('beverage') || cat.includes('drink') || cat.includes('water') || cat.includes('soda')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1527960656366-ee2a999e3286?w=400';
    fallbackSource = 'Beverages Placeholder';
  } else if (cat.includes('personal') || cat.includes('care') || cat.includes('hygiene') || cat.includes('soap') || cat.includes('beauty')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400';
    fallbackSource = 'Personal Care Placeholder';
  } else if (cat.includes('fashion') || cat.includes('clothing') || cat.includes('apparel')) {
    fallbackUrl = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400';
    fallbackSource = 'Fashion Placeholder';
  } else {
    fallbackUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';
    fallbackSource = 'Grocery Placeholder';
  }

  await saveToCache(cleanName, fallbackUrl, fallbackSource);
  return { url: fallbackUrl, source: fallbackSource };
}

// Helper to seed default products based on category
function getSeedProducts(category: string, shopId: string): ProductRecord[] {
  const cat = category.toLowerCase();
  const now = new Date().toISOString();

  if (cat.includes('bakery') || cat.includes('cake') || cat.includes('confectionery')) {
    return [
      {
        id: `${shopId}-p1`,
        shop_id: shopId,
        name: 'Premium Chocolate Fudge Cake',
        category: 'Bakery',
        brand: 'Bakehouse',
        sku: 'BAKE-FUDGE-01',
        barcode: '8901234567890',
        description: 'Rich dark chocolate cake layered with decadent fudge frosting.',
        price: '450',
        mrp: '500',
        discount: '10%',
        gst: '5%',
        weight: '1kg',
        dimensions: '8x8x4 inches',
        stock: '15',
        min_stock_alert: '5',
        supplier_name: 'Direct Bakery Supplies',
        tags: 'cake, chocolate, dessert, popular',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60',
        views: '240',
        sold: '85',
        revenue: '38250',
        rating: '4.8',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p2`,
        shop_id: shopId,
        name: 'Fresh Bread Loaf',
        category: 'Bakery',
        brand: 'DailyCrust',
        sku: 'BAKE-BREAD-02',
        barcode: '8901234567891',
        description: 'Freshly baked classic soft white bread loaf.',
        price: '60',
        mrp: '65',
        discount: '7%',
        gst: '0%',
        weight: '400g',
        dimensions: '8x4x4 inches',
        stock: '25',
        min_stock_alert: '10',
        supplier_name: 'Flour Association',
        tags: 'bread, fresh, daily, organic',
        delivery_type: 'Express',
        images: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60',
        views: '150',
        sold: '110',
        revenue: '6600',
        rating: '4.3',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p3`,
        shop_id: shopId,
        name: 'Chocolate Chip Cookies',
        category: 'Bakery',
        brand: 'SweetBites',
        sku: 'BAKE-COOKIE-03',
        barcode: '8901234567892',
        description: 'Crispy on the outside, chewy on the inside cookies.',
        price: '120',
        mrp: '140',
        discount: '14%',
        gst: '18%',
        weight: '250g',
        dimensions: '6x4x2 inches',
        stock: '4',
        min_stock_alert: '5',
        supplier_name: 'Sweet Distribution Corp',
        tags: 'cookie, chocolate, snack',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1499636136210-6f4ee9127357?w=400&auto=format&fit=crop&q=60',
        views: '320',
        sold: '150',
        revenue: '18000',
        rating: '4.5',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p4`,
        shop_id: shopId,
        name: 'Glazed Donuts (Pack of 4)',
        category: 'Bakery',
        brand: 'GlazeKings',
        sku: 'BAKE-DONUT-04',
        barcode: '8901234567893',
        description: 'Classic glazed sweet ring donuts.',
        price: '80',
        mrp: '90',
        discount: '11%',
        gst: '18%',
        weight: '200g',
        dimensions: '6x6x2 inches',
        stock: '0',
        min_stock_alert: '8',
        supplier_name: 'Glaze Distributors',
        tags: 'donut, sweet, pastry',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&auto=format&fit=crop&q=60',
        views: '180',
        sold: '40',
        revenue: '3200',
        rating: '4.4',
        created_at: now,
        last_updated: now
      }
    ];
  }

  if (cat.includes('pharmacy') || cat.includes('medicine') || cat.includes('chemist') || cat.includes('health') || cat.includes('medical')) {
    return [
      {
        id: `${shopId}-p1`,
        shop_id: shopId,
        name: 'Paracetamol 650mg (15 Tablets)',
        category: 'Pharmacy',
        brand: 'Generic Health',
        sku: 'MED-PARA-650',
        barcode: '8902234567890',
        description: 'Fast relief from pain and fever.',
        price: '30',
        mrp: '32',
        discount: '6%',
        gst: '12%',
        weight: '20g',
        dimensions: '4x2x0.5 inches',
        stock: '35',
        min_stock_alert: '15',
        supplier_name: 'Pharma Link',
        tags: 'pain, fever, generic, essential',
        delivery_type: 'Express',
        images: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
        views: '450',
        sold: '320',
        revenue: '9600',
        rating: '4.7',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p2`,
        shop_id: shopId,
        name: 'Vitamin C + Zinc Tablets',
        category: 'Pharmacy',
        brand: 'LifeVits',
        sku: 'MED-VITC-100',
        barcode: '8902234567891',
        description: 'Daily immunity boosting tablets.',
        price: '180',
        mrp: '200',
        discount: '10%',
        gst: '18%',
        weight: '80g',
        dimensions: '3x3x5 inches',
        stock: '3',
        min_stock_alert: '5',
        supplier_name: 'Nutra Wholesale',
        tags: 'vitamin, immunity, supplements',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?w=400&auto=format&fit=crop&q=60',
        views: '210',
        sold: '90',
        revenue: '16200',
        rating: '4.5',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p3`,
        shop_id: shopId,
        name: 'Complete First Aid Kit',
        category: 'Pharmacy',
        brand: 'SafeGuard',
        sku: 'MED-KIT-01',
        barcode: '8902234567892',
        description: 'Essential bandages, antiseptics, and tools.',
        price: '350',
        mrp: '400',
        discount: '12%',
        gst: '12%',
        weight: '500g',
        dimensions: '8x6x4 inches',
        stock: '12',
        min_stock_alert: '4',
        supplier_name: 'MedTech Supplies',
        tags: 'firstaid, safety, emergency',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=60',
        views: '180',
        sold: '45',
        revenue: '15750',
        rating: '4.8',
        created_at: now,
        last_updated: now
      }
    ];
  }

  if (cat.includes('electronic') || cat.includes('mobile') || cat.includes('tech') || cat.includes('computer') || cat.includes('phone')) {
    return [
      {
        id: `${shopId}-p1`,
        shop_id: shopId,
        name: 'Wireless Bluetooth Headphones',
        category: 'Electronics',
        brand: 'SonicWave',
        sku: 'ELEC-HEAD-01',
        barcode: '8903234567890',
        description: 'Immersive sound with active noise cancellation.',
        price: '1800',
        mrp: '2400',
        discount: '25%',
        gst: '18%',
        weight: '250g',
        dimensions: '7x6x3 inches',
        stock: '8',
        min_stock_alert: '3',
        supplier_name: 'Tech Distributors Inc',
        tags: 'wireless, audio, premium, sale',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60',
        views: '540',
        sold: '45',
        revenue: '81000',
        rating: '4.6',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p2`,
        shop_id: shopId,
        name: 'Mechanical Gaming Keyboard',
        category: 'Electronics',
        brand: 'KeyClicks',
        sku: 'ELEC-KEY-02',
        barcode: '8903234567891',
        description: 'Tactile mechanical switches with RGB backlit keys.',
        price: '790',
        mrp: '990',
        discount: '20%',
        gst: '18%',
        weight: '800g',
        dimensions: '18x6x2 inches',
        stock: '2',
        min_stock_alert: '5',
        supplier_name: 'Gear Wholesale',
        tags: 'keyboard, gaming, rgb',
        delivery_type: 'Standard',
        images: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=60',
        views: '380',
        sold: '50',
        revenue: '39500',
        rating: '4.3',
        created_at: now,
        last_updated: now
      }
    ];
  }

  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) {
    return [
      {
        id: `${shopId}-p1`,
        shop_id: shopId,
        name: 'Special Veg Burger',
        category: 'Restaurant',
        brand: 'Nexthood Eats',
        sku: 'FOOD-BURGER-01',
        barcode: '8904234567890',
        description: 'Crispy veg patty, fresh lettuce, cheddar cheese, and house sauce.',
        price: '180',
        mrp: '200',
        discount: '10%',
        gst: '5%',
        weight: '300g',
        dimensions: '4x4x4 inches',
        stock: '30',
        min_stock_alert: '10',
        supplier_name: 'Kitchen Central',
        tags: 'burger, fastfood, veg',
        delivery_type: 'Express',
        images: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
        views: '600',
        sold: '410',
        revenue: '73800',
        rating: '4.5',
        created_at: now,
        last_updated: now
      },
      {
        id: `${shopId}-p2`,
        shop_id: shopId,
        name: 'Margherita Pizza (10")',
        category: 'Restaurant',
        brand: 'Pizzaria',
        sku: 'FOOD-PIZZA-02',
        barcode: '8904234567891',
        description: 'Classic sourdough pizza base with San Marzano tomatoes and mozzarella.',
        price: '260',
        mrp: '300',
        discount: '13%',
        gst: '5%',
        weight: '500g',
        dimensions: '10x10x1 inches',
        stock: '5',
        min_stock_alert: '5',
        supplier_name: 'Kitchen Central',
        tags: 'pizza, cheese, popular',
        delivery_type: 'Express',
        images: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=60',
        views: '480',
        sold: '230',
        revenue: '59800',
        rating: '4.7',
        created_at: now,
        last_updated: now
      }
    ];
  }

  // Default: Grocery Store
  return [
    {
      id: `${shopId}-p1`,
      shop_id: shopId,
      name: 'Fresh Organic Milk (1L)',
      category: 'Grocery Store',
      brand: 'FarmPure',
      sku: 'GROC-MILK-01',
      barcode: '8905234567890',
      description: 'Pasteurized, homogenized premium fresh milk.',
      price: '58',
      mrp: '60',
      discount: '3%',
      gst: '0%',
      weight: '1kg',
      dimensions: '4x4x8 inches',
      stock: '15',
      min_stock_alert: '5',
      supplier_name: 'Dairyland Foods',
      tags: 'milk, dairy, organic, breakfast',
      delivery_type: 'Express',
      images: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60',
      views: '750',
      sold: '512',
      revenue: '29696',
      rating: '4.2',
      created_at: now,
      last_updated: now
    },
    {
      id: `${shopId}-p2`,
      shop_id: shopId,
      name: 'Basmati Rice (1kg)',
      category: 'Grocery Store',
      brand: 'AgedGold',
      sku: 'GROC-RICE-02',
      barcode: '8905234567891',
      description: 'Long grain, aromatic premium aged Basmati rice.',
      price: '75',
      mrp: '90',
      discount: '16%',
      gst: '5%',
      weight: '1kg',
      dimensions: '6x9x2 inches',
      stock: '25',
      min_stock_alert: '10',
      supplier_name: 'Grain Wholesale Corp',
      tags: 'rice, grains, staple',
      delivery_type: 'Standard',
      images: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60',
      views: '340',
      sold: '120',
      revenue: '9000',
      rating: '4.5',
      created_at: now,
      last_updated: now
    },
    {
      id: `${shopId}-p3`,
      shop_id: shopId,
      name: 'Fresh Eggs (Pack of 12)',
      category: 'Grocery Store',
      brand: 'CoopFresh',
      sku: 'GROC-EGGS-03',
      barcode: '8905234567892',
      description: 'Naturally raised, protein-rich brown eggs.',
      price: '80',
      mrp: '95',
      discount: '15%',
      gst: '0%',
      weight: '600g',
      dimensions: '12x4x3 inches',
      stock: '4',
      min_stock_alert: '5',
      supplier_name: 'Coop Poultry',
      tags: 'eggs, dairy, protein',
      delivery_type: 'Standard',
      images: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=60',
      views: '400',
      sold: '190',
      revenue: '15200',
      rating: '4.6',
      created_at: now,
      last_updated: now
    }
  ];
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = session.id;

    // Load registered seller category
    const sellers = await readCsv<SellerUser>('seller_users.csv', [
      'id',
      'store_name',
      'owner_name',
      'email',
      'business_category'
    ]);
    const seller = sellers.find(s => s.id === shopId);
    const category = seller?.business_category || 'Grocery Store';

    // Load products database
    let products = await readCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS);

    // Filter for current seller
    let sellerProducts = products.filter(p => p.shop_id === shopId);

    // Seed default products if none exist
    if (sellerProducts.length === 0) {
      console.log(`[DEBUG] Seeding default products for seller: ${shopId} with category: ${category}`);
      const seeds = getSeedProducts(category, shopId);
      for (const seed of seeds) {
        await appendCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS, seed);
      }
      // Re-read after seeding
      products = await readCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS);
      sellerProducts = products.filter(p => p.shop_id === shopId);
    }

    return NextResponse.json({ success: true, products: sellerProducts });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = session.id;
    const body = await req.json();
    const now = new Date().toISOString();

    const imagesUrl = (body.images || '').trim();
    const thumbnailUrl = (body.thumbnail_url || '').trim();

    if (!imagesUrl) {
      return NextResponse.json({ error: 'Product Image is mandatory.' }, { status: 400 });
    }

    const newProduct: ProductRecord = {
      id: `${shopId}-${crypto.randomUUID().slice(0, 8)}`,
      shop_id: shopId,
      name: (body.name || '').trim(),
      category: (body.category || '').trim(),
      brand: (body.brand || '').trim(),
      sku: (body.sku || '').trim() || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: (body.barcode || '').trim(),
      description: (body.description || '').trim(),
      price: String(body.price || '0'),
      mrp: String(body.mrp || body.price || '0'),
      discount: (body.discount || '').trim(),
      gst: (body.gst || '0%').trim(),
      weight: (body.weight || '').trim(),
      dimensions: (body.dimensions || '').trim(),
      stock: String(body.stock || '0'),
      min_stock_alert: String(body.min_stock_alert || '5'),
      supplier_name: (body.supplier_name || '').trim(),
      tags: (body.tags || '').trim(),
      delivery_type: (body.delivery_type || 'Standard').trim(),
      images: imagesUrl,
      thumbnail_url: thumbnailUrl,
      views: '0',
      sold: '0',
      revenue: '0',
      rating: '0',
      created_at: now,
      last_updated: now
    };

    if (!newProduct.name || !newProduct.price) {
      return NextResponse.json({ error: 'Product Name and Price are required.' }, { status: 400 });
    }

    await appendCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS, newProduct);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = session.id;
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const products = await readCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS);
    const existingIndex = products.findIndex(p => p.id === body.id && p.shop_id === shopId);

    if (existingIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const current = products[existingIndex];

    const updatedProduct: ProductRecord = {
      ...current,
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      category: body.category !== undefined ? String(body.category).trim() : current.category,
      brand: body.brand !== undefined ? String(body.brand).trim() : current.brand,
      sku: body.sku !== undefined ? String(body.sku).trim() : current.sku,
      barcode: body.barcode !== undefined ? String(body.barcode).trim() : current.barcode,
      description: body.description !== undefined ? String(body.description).trim() : current.description,
      price: body.price !== undefined ? String(body.price) : current.price,
      mrp: body.mrp !== undefined ? String(body.mrp) : current.mrp,
      discount: body.discount !== undefined ? String(body.discount).trim() : current.discount,
      gst: body.gst !== undefined ? String(body.gst).trim() : current.gst,
      weight: body.weight !== undefined ? String(body.weight).trim() : current.weight,
      dimensions: body.dimensions !== undefined ? String(body.dimensions).trim() : current.dimensions,
      stock: body.stock !== undefined ? String(body.stock) : current.stock,
      min_stock_alert: body.min_stock_alert !== undefined ? String(body.min_stock_alert) : current.min_stock_alert,
      supplier_name: body.supplier_name !== undefined ? String(body.supplier_name).trim() : current.supplier_name,
      tags: body.tags !== undefined ? String(body.tags).trim() : current.tags,
      delivery_type: body.delivery_type !== undefined ? String(body.delivery_type).trim() : current.delivery_type,
      images: body.images !== undefined ? String(body.images).trim() : current.images,
      thumbnail_url: body.thumbnail_url !== undefined ? String(body.thumbnail_url).trim() : current.thumbnail_url,
      last_updated: now
    };

    products[existingIndex] = updatedProduct;
    await writeCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS, products);

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = session.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const products = await readCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS);
    const filteredProducts = products.filter(p => !(p.id === id && p.shop_id === shopId));

    if (products.length === filteredProducts.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await writeCsv<ProductRecord>('products.csv', PRODUCT_COLUMNS, filteredProducts);

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
