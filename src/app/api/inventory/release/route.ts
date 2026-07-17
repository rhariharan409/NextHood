import { NextResponse } from 'next/server';
import { readCsv, writeCsv, appendCsv, ProductInventory } from '@/lib/csvDb';
import { inventoryMutex } from '@/lib/mutex';

export async function POST(req: Request) {
  try {
    const { shopId, productId, quantity } = await req.json();

    if (!shopId || !productId || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const lockKey = `${shopId}:${productId}`;

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

      let currentStock = 25;

      if (existingRecordIndex !== -1) {
        currentStock = parseInt(inventory[existingRecordIndex].stock_quantity) || 0;
      }

      // Restore stock (increment)
      const newStock = currentStock + quantity;

      const updatedRecord: ProductInventory = {
        product_id: productId,
        shop_id: shopId,
        stock_quantity: String(newStock),
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

      return { success: true, stock: newStock };
    });

    return NextResponse.json({ success: true, productId, stock: result.stock });
  } catch (error: any) {
    console.error('Release API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
