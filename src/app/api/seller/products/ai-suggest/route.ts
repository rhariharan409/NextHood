import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, category } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    // Default smart mock generator
    const generateSmartMocks = (productName: string, catName: string) => {
      const cleanName = productName.trim();
      const cleanCat = catName || 'Grocery';
      
      const tags = `${cleanName.toLowerCase().replace(/\s+/g, ', ')}, fresh, premium, local, ${cleanCat.toLowerCase()}`;
      const keywords = `${cleanName.toLowerCase()}, buy ${cleanName.toLowerCase()} online, fresh ${cleanName.toLowerCase()}, best price`;
      
      return {
        description: `Premium quality ${cleanName}. Sourced from local suppliers to ensure maximum freshness and taste. Ideal for daily family consumption and healthy living.`,
        tags: tags,
        keywords: keywords,
        categorySuggestion: cleanCat,
        altText: `High-resolution package photo of ${cleanName} on a clean background`,
        searchKeywords: `${cleanName.toLowerCase()}, organic ${cleanName.toLowerCase()}, local ${cleanName.toLowerCase()}`,
        relatedProducts: `${cleanName} Small, ${cleanName} Premium Pack, Alternative Brands`,
        priceRecommendation: "50",
        inventoryRecommendation: "30"
      };
    };

    if (!geminiKey) {
      const suggestions = generateSmartMocks(name, category);
      return NextResponse.json({ success: true, suggestions });
    }

    // Call Gemini for high quality suggestions
    const prompt = `You are a helpful AI assistant for NextHood e-commerce store sellers. 
Given a product name: "${name}" and its tentative category: "${category}", generate e-commerce suggestions in JSON format.
The JSON must contain the following keys exactly:
- description: A professional product description (approx 2 sentences).
- tags: Comma-separated tags (e.g. "milk, dairy, fresh").
- keywords: Comma-separated search engine keywords.
- categorySuggestion: The best fit category (e.g. "Dairy", "Bakery", "Vegetables", "Fruits", "Personal Care", "Medicines", "Electronics", "Grocery").
- altText: Descriptive Alt text for the product image.
- searchKeywords: Internal shop search keywords.
- relatedProducts: Comma-separated names of 3 related product ideas.
- priceRecommendation: Recommended retail price as a number string (e.g. "45").
- inventoryRecommendation: Recommended stock quantity as a number string (e.g. "25").

Return ONLY valid JSON and nothing else. Do not wrap in markdown code blocks.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(text.trim());
        return NextResponse.json({ success: true, suggestions: parsed });
      }
    } catch (err) {
      console.error('[GEMINI AI SUGGESTION FAILED] Fallback to mock:', err);
    }

    const suggestions = generateSmartMocks(name, category);
    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('AI suggestions endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
