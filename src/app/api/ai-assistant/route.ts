import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
You are the Nexthood AI Shopping Assistant. Your role is to convert customer goals (e.g., cooking biryani, baking a cake, hosting a party, buying groceries, treating a cold) into a structured local shopping plan.

STRICT CONSTRAINTS:
1. NEVER invent or hallucinate products. You must ONLY select from this exact list of available products:
   - ID: "3928172901-p1", Name: "Fresh Organic Apples (1kg)", Price: 160, ShopId: "3928172901", ShopName: "Nexthood Corner Store", Category: "Fruits & Vegetables"
   - ID: "3928172901-p2", Name: "Fresh Local Farm Tomatoes (1kg)", Price: 60, ShopId: "3928172901", ShopName: "Nexthood Corner Store", Category: "Fruits & Vegetables"
   - ID: "3928172901-p3", Name: "Full Cream Milk (1L)", Price: 74, ShopId: "3928172901", ShopName: "Nexthood Corner Store", Category: "Dairy & Eggs"
   - ID: "3928172901-p4", Name: "Farm Fresh Brown Eggs (Pack of 12)", Price: 90, ShopId: "3928172901", ShopName: "Nexthood Corner Store", Category: "Dairy & Eggs"
   - ID: "3928172902-p1", Name: "Premium Chocolate Fudge Cake", Price: 450, ShopId: "3928172902", ShopName: "Nexthood Central Bakery", Category: "Cakes"
   - ID: "3928172902-p2", Name: "Fresh Blueberry Muffin", Price: 90, ShopId: "3928172902", ShopName: "Nexthood Central Bakery", Category: "Pastries"
   - ID: "3928172902-p3", Name: "Artisanal Sourdough Bread", Price: 120, ShopId: "3928172902", ShopName: "Nexthood Central Bakery", Category: "Bread"
   - ID: "3928172902-p4", Name: "Buttery French Croissant", Price: 80, ShopId: "3928172902", ShopName: "Nexthood Central Bakery", Category: "Pastries"
   - ID: "3928172903-p1", Name: "Nexthood Special Burger", Price: 180, ShopId: "3928172903", ShopName: "Nexthood Gourmet Bistro", Category: "Mains"
   - ID: "3928172903-p2", Name: "Margherita Pizza (10\")", Price: 260, ShopId: "3928172903", ShopName: "Nexthood Gourmet Bistro", Category: "Mains"
   - ID: "3928172903-p3", Name: "Premium Espresso Macchiato", Price: 110, ShopId: "3928172903", ShopName: "Nexthood Gourmet Bistro", Category: "Beverages"
   - ID: "3928172903-p4", Name: "Healthy Caesar Salad", Price: 150, ShopId: "3928172903", ShopName: "Nexthood Gourmet Bistro", Category: "Sides"
   - ID: "3928172904-p1", Name: "Paracetamol 650mg (15 Tablets)", Price: 30, ShopId: "3928172904", ShopName: "Nexthood Wellness Pharmacy", Category: "OTC Medicines"
   - ID: "3928172904-p2", Name: "Premium Vitamin C + Zinc Chewables", Price: 180, ShopId: "3928172904", ShopName: "Nexthood Wellness Pharmacy", Category: "Vitamins & Supplements"
   - ID: "3928172904-p3", Name: "Waterproof Band-Aid Strips (20 Pack)", Price: 60, ShopId: "3928172904", ShopName: "Nexthood Wellness Pharmacy", Category: "First Aid"

2. If a required item is not directly in the list (e.g. spices, paneer, chicken), you must recommend the closest substitute from the above list, or group them logically under closest categories (e.g. suggest Sourdough Bread or Muffin for baking requests; suggest Apples or Tomatoes for vegetable/cooking requests).
3. If the request is ambiguous (e.g. "I want biryani" without guest counts or veg/non-veg choice), ask clarifying follow-up questions instead of returning a shopping list. Set "followUpType" to "biryani_clarify" or "generic".
4. You must output ONLY a valid JSON object matching the following structure:
{
  "text": "AI reply explaining the plan or asking questions...",
  "followUpType": "biryani_clarify" | "generic" | null,
  "shoppingList": [
    {
      "id": "product_id",
      "name": "product_name",
      "price": 120,
      "quantity": 1,
      "shopId": "shop_id",
      "shopName": "shop_name",
      "reason": "why this product was selected..."
    }
  ],
  "savingsSummary": {
    "totalCost": 350,
    "savings": 45,
    "storesCount": 2,
    "deliveryTime": 24,
    "reason": "explanation of store optimization (e.g. cheapest option, combined shipping...)"
  }
}
`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message parameter is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let llmResponse = '';

    // 1. Google Gemini API (Preferred)
    if (geminiKey) {
      console.log('[DEBUG] Querying Gemini API for AI Shopping Assistant');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nUser request: "${message}"` }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        llmResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    }
    // 2. OpenAI GPT API
    else if (openaiKey) {
      console.log('[DEBUG] Querying OpenAI API for AI Shopping Assistant');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        llmResponse = data.choices?.[0]?.message?.content || '';
      }
    }
    // 3. Anthropic Claude API
    else if (claudeKey) {
      console.log('[DEBUG] Querying Anthropic Claude API for AI Shopping Assistant');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: message }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        llmResponse = data.content?.[0]?.text || '';
      }
    }
    // 4. Groq API
    else if (groqKey) {
      console.log('[DEBUG] Querying Groq API for AI Shopping Assistant');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        llmResponse = data.choices?.[0]?.message?.content || '';
      }
    }

    // 5. Fallback Parser (if no LLM Key is configured or API fails)
    if (!llmResponse) {
      console.log('[DEBUG] No LLM keys present or API failed. Using local dynamic semantic fallback.');
      const query = message.toLowerCase().trim();

      // Check clarification for Biryani
      if (query.includes('biryani') && !query.includes('chicken') && !query.includes('veg') && !query.includes('clarified')) {
        return NextResponse.json({
          text: 'I can help you build the perfect list for biryani! Would you like Chicken or Veg biryani? And how many people is it for?',
          followUpType: 'biryani_clarify',
          shoppingList: []
        });
      }

      let multiplier = 1;
      const peopleMatch = query.match(/for\s+(\d+)\s+people/);
      if (peopleMatch) {
        multiplier = Math.ceil(parseInt(peopleMatch[1]) / 2);
      }

      let selectedList = [];
      if (query.includes('biryani')) {
        const isVeg = query.includes('veg');
        selectedList = [
          { id: '3928172901-p3', name: 'Full Cream Milk (1L)', price: 74, quantity: 1 * multiplier, shopId: '3928172901', shopName: 'Nexthood Corner Store', reason: 'Closest merchant with fresh dairy items.' },
          { id: '3928172901-p2', name: 'Fresh Local Farm Tomatoes (1kg)', price: 60, quantity: 1 * multiplier, shopId: '3928172901', shopName: 'Nexthood Corner Store', reason: 'Freshly harvested local farm tomatoes.' }
        ];
        if (!isVeg) {
          selectedList.push({ id: '3928172903-p1', name: 'Nexthood Special Burger', price: 180, quantity: 1 * multiplier, shopId: '3928172903', shopName: 'Nexthood Gourmet Bistro', reason: 'Provides raw ingredients substitute from restaurant menu.' });
        }
      } else if (query.includes('cake')) {
        selectedList = [
          { id: '3928172902-p1', name: 'Premium Chocolate Fudge Cake', price: 450, quantity: 1, shopId: '3928172902', shopName: 'Nexthood Central Bakery', reason: 'Pre-baked chocolate cake matching your dessert needs.' }
        ];
      } else if (query.includes('groceries') || query.includes('week') || query.includes('breakfast')) {
        selectedList = [
          { id: '3928172901-p3', name: 'Full Cream Milk (1L)', price: 74, quantity: 3, shopId: '3928172901', shopName: 'Nexthood Corner Store', reason: 'Essential dairy for weekly needs.' },
          { id: '3928172901-p4', name: 'Farm Fresh Brown Eggs (Pack of 12)', price: 90, quantity: 2, shopId: '3928172901', shopName: 'Nexthood Corner Store', reason: 'Farm fresh brown eggs.' },
          { id: '3928172902-p3', name: 'Artisanal Sourdough Bread', price: 120, quantity: 1, shopId: '3928172902', shopName: 'Nexthood Central Bakery', reason: 'Warm baked fresh bread.' }
        ];
      } else if (query.includes('diabetic') || query.includes('healthy')) {
        selectedList = [
          { id: '3928172901-p1', name: 'Fresh Organic Apples (1kg)', price: 160, quantity: 2, shopId: '3928172901', shopName: 'Nexthood Corner Store', reason: 'Low glycemic index organic fruits.' },
          { id: '3928172903-p4', name: 'Healthy Caesar Salad', price: 150, quantity: 1, shopId: '3928172903', shopName: 'Nexthood Gourmet Bistro', reason: 'Fresh greens and proteins.' }
        ];
      } else if (query.includes('first-aid') || query.includes('medicine')) {
        selectedList = [
          { id: '3928172904-p1', name: 'Paracetamol 650mg (15 Tablets)', price: 30, quantity: 2, shopId: '3928172904', shopName: 'Nexthood Wellness Pharmacy', reason: 'Over-the-counter pain/fever reliever.' },
          { id: '3928172904-p3', name: 'Waterproof Band-Aid Strips (20 Pack)', price: 60, quantity: 1, shopId: '3928172904', shopName: 'Nexthood Wellness Pharmacy', reason: 'Sterile adhesive bandages.' }
        ];
      } else {
        selectedList = [
          { id: '3928172901-p3', name: 'Full Cream Milk (1L)', price: 74, quantity: 1, shopId: '3928172901', shopName: 'Nexthood Corner Store', reason: 'Daily essential dairy.' }
        ];
      }

      const totalCost = selectedList.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const savings = Math.round(totalCost * 0.12);
      const storesCount = new Set(selectedList.map(i => i.shopId)).size;
      const deliveryTime = storesCount * 12;

      return NextResponse.json({
        text: `I have compiled a local shopping list for your goal: "${message}". The list contains actual available products from your nearby merchants.`,
        followUpType: null,
        shoppingList: selectedList,
        savingsSummary: {
          totalCost,
          savings,
          storesCount,
          deliveryTime,
          reason: 'Calculated using nearby shop stock mappings.'
        }
      });
    }

    // Parse LLM JSON string
    try {
      const parsed = JSON.parse(llmResponse.trim());
      return NextResponse.json(parsed);
    } catch (e) {
      console.error('[ERROR] Failed to parse LLM JSON output:', llmResponse);
      return NextResponse.json({ error: 'LLM returned invalid JSON structure' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[ERROR] AI Assistant backend failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
