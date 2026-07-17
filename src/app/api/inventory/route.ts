import { NextResponse } from 'next/server';
import { readCsv, writeCsv, appendCsv, ProductInventory } from '@/lib/csvDb';
import { inventoryMutex } from '@/lib/mutex';

// GET: Fetch product stock quantities for a shop
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ error: 'shopId parameter is required' }, { status: 400 });
    }

    const inventory = await readCsv<ProductInventory>('products_inventory.csv', [
      'product_id',
      'shop_id',
      'stock_quantity',
      'last_updated'
    ]);

    const shopInventory = inventory.filter(item => item.shop_id === shopId);

    return NextResponse.json({ success: true, inventory: shopInventory });
  } catch (error: any) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Update inventory (purchase or restock) wrapped in serialization mutex lock
export async function POST(req: Request) {
  try {
    const { shopId, productId, action, quantity } = await req.json();

    if (!shopId || !productId || !action || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const lockKey = `${shopId}:${productId}`;

    // Execute atomic read-and-write operation inside Mutex
    const result = await inventoryMutex.runExclusive(lockKey, async () => {
      const inventory = await readCsv<ProductInventory>('products_inventory.csv', [
        'product_id',
        'shop_id',
        'stock_quantity',
        'last_updated'
      ]);

      let existingRecordIndex = inventory.findIndex(
        item => item.shop_id === shopId && item.product_id === productId
      );

      let currentStock = 25; // Default stock if none exists yet

      if (existingRecordIndex !== -1) {
        currentStock = parseInt(inventory[existingRecordIndex].stock_quantity) || 0;
      }

      // Check for zero stock during purchase
      if (action === 'purchase' && currentStock <= 0) {
        return { error: 'Out of Stock', status: 409, stock: 0 };
      }

      // Process action
      if (action === 'purchase') {
        currentStock = Math.max(0, currentStock - quantity);
      } else if (action === 'restock') {
        currentStock += quantity;
      }

      const updatedRecord: ProductInventory = {
        product_id: productId,
        shop_id: shopId,
        stock_quantity: String(currentStock),
        last_updated: new Date().toISOString()
      };

      if (existingRecordIndex !== -1) {
        inventory[existingRecordIndex] = updatedRecord;
        await writeCsv<ProductInventory>('products_inventory.csv', [
          'product_id',
          'shop_id',
          'stock_quantity',
          'last_updated'
        ], inventory);
      } else {
        await appendCsv<ProductInventory>('products_inventory.csv', [
          'product_id',
          'shop_id',
          'stock_quantity',
          'last_updated'
        ], updatedRecord);
      }

      return { success: true, stock: currentStock };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error, stock: result.stock }, { status: result.status });
    }

    return NextResponse.json({ success: true, productId, stock: result.stock });
  } catch (error: any) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
