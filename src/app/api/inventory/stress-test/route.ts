import { NextResponse } from 'next/server';
import { readCsv, writeCsv, ProductInventory } from '@/lib/csvDb';
import { inventoryMutex } from '@/lib/mutex';

export async function POST(req: Request) {
  try {
    const { shopId, productId } = await req.json();

    if (!shopId || !productId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const lockKey = `${shopId}:${productId}`;

    // 1. Reset stock to exactly 50 in database under exclusive mutex lock
    await inventoryMutex.runExclusive(lockKey, async () => {
      const inventory = await readCsv<ProductInventory>('products_inventory.csv', [
        'product_id',
        'shop_id',
        'stock_quantity',
        'last_updated'
      ]);

      const existingRecordIndex = inventory.findIndex(
        item => item.shop_id === shopId && item.product_id === productId
      );

      const resetRecord: ProductInventory = {
        product_id: productId,
        shop_id: shopId,
        stock_quantity: '50',
        last_updated: new Date().toISOString()
      };

      if (existingRecordIndex !== -1) {
        inventory[existingRecordIndex] = resetRecord;
      } else {
        inventory.push(resetRecord);
      }

      await writeCsv<ProductInventory>('products_inventory.csv', [
        'product_id',
        'shop_id',
        'stock_quantity',
        'last_updated'
      ], inventory);
    });

    console.log(`[STRESS-TEST] Reset stock for ${lockKey} to 50. Commencing 100 concurrent requests...`);

    // 2. Spawn 100 concurrent mock reservation requests
    const promises: Promise<any>[] = [];
    const baseUrl = new URL(req.url).origin;

    for (let i = 0; i < 100; i++) {
      promises.push(
        fetch(`${baseUrl}/api/inventory/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId, productId, quantity: 1 })
        })
          .then(async (res) => {
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
          })
          .catch((err) => {
            return { ok: false, error: err.message };
          })
      );
    }

    // Wait for all 100 requests to complete simultaneously
    const results = await Promise.all(promises);

    let successCount = 0;
    let conflictCount = 0;
    let otherErrorCount = 0;

    results.forEach((res) => {
      if (res.ok && res.data?.success) {
        successCount++;
      } else if (res.status === 409) {
        conflictCount++;
      } else {
        otherErrorCount++;
      }
    });

    // 3. Read final stock to confirm
    let finalStock = -1;
    const inventory = await readCsv<ProductInventory>('products_inventory.csv', [
      'product_id',
      'shop_id',
      'stock_quantity',
      'last_updated'
    ]);
    const finalRecord = inventory.find(item => item.shop_id === shopId && item.product_id === productId);
    if (finalRecord) {
      finalStock = parseInt(finalRecord.stock_quantity) || 0;
    }

    console.log(`[STRESS-TEST] Completed: Successes=${successCount}, OutOfStockRejections=${conflictCount}, Errors=${otherErrorCount}, FinalStock=${finalStock}`);

    return NextResponse.json({
      success: true,
      initialStock: 50,
      totalRequests: 100,
      successfulReservations: successCount,
      rejectedReservations: conflictCount,
      otherErrors: otherErrorCount,
      finalStock
    });
  } catch (error: any) {
    console.error('Stress test execution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
