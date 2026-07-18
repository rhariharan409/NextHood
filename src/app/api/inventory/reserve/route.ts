import { NextResponse } from 'next/server';
import { readCsv, writeCsv } from '@/lib/csvDb';
import { inventoryMutex } from '@/lib/mutex';

export async function POST(req: Request) {
  try {
    const { productId, quantity } = await req.json();

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const lockKey = `product:${productId}`;

    const result = await inventoryMutex.runExclusive(lockKey, async () => {
      const products = await readCsv<any>('products.csv', [
        'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
        'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
        'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
        'created_at', 'last_updated'
      ]);

      const prodIdx = products.findIndex(p => p.id === productId);
      if (prodIdx === -1) {
        return { error: 'Product not found', status: 404, stock: 0 };
      }

      const currentStock = parseInt(products[prodIdx].stock) || 0;

      if (currentStock < quantity) {
        return { error: 'Out of Stock', status: 409, stock: currentStock };
      }

      // Decrement stock in products.csv
      const newStock = currentStock - quantity;
      products[prodIdx].stock = String(newStock);

      await writeCsv<any>('products.csv', [
        'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
        'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
        'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
        'created_at', 'last_updated'
      ], products);

      return { success: true, stock: newStock };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error, stock: result.stock }, { status: result.status });
    }

    return NextResponse.json({ success: true, productId, stock: result.stock });
  } catch (error: any) {
    console.error('Reservation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
