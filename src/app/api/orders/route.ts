import { NextResponse } from 'next/server';
import { readCsv, writeCsv, appendCsv } from '@/lib/csvDb';
import { inventoryMutex } from '@/lib/mutex';

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  storeName: string;
  items_json: string;
  subtotal: string;
  deliveryCharge: string;
  platformFee: string;
  tax: string;
  grandTotal: string;
  paymentMethod: string;
  deliveryAddress: string;
  latitude: string;
  longitude: string;
  status: string;
  createdAt: string;
  rejectReason?: string;
}

const ORDER_COLUMNS: (keyof OrderRecord)[] = [
  'id',
  'orderNumber',
  'customerId',
  'customerName',
  'sellerId',
  'sellerName',
  'storeName',
  'items_json',
  'subtotal',
  'deliveryCharge',
  'platformFee',
  'tax',
  'grandTotal',
  'paymentMethod',
  'deliveryAddress',
  'latitude',
  'longitude',
  'status',
  'createdAt',
  'rejectReason'
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerId,
      customerName,
      sellerId,
      sellerName,
      storeName,
      items,
      subtotal,
      deliveryCharge,
      platformFee,
      tax,
      grandTotal,
      paymentMethod,
      deliveryAddress,
      latitude,
      longitude
    } = body;

    // Validate required fields explicitly
    const missing: string[] = [];
    if (!customerId) missing.push('customerId');
    if (!sellerId) missing.push('sellerId');
    if (!items || items.length === 0) missing.push('items');
    if (subtotal === undefined || isNaN(Number(subtotal))) missing.push('subtotal');
    if (grandTotal === undefined || isNaN(Number(grandTotal))) missing.push('grandTotal');
    if (!paymentMethod) missing.push('paymentMethod');
    if (!deliveryAddress) missing.push('deliveryAddress');

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
    }

    const orderId = 'NH-' + Math.floor(100000 + Math.random() * 900000);
    const orderNumber = 'ORD-' + Math.floor(1000000 + Math.random() * 9000000);

    // Run exclusive lock for order placement
    const result = await inventoryMutex.runExclusive(sellerId, async () => {
      // Create the order record in orders.csv
      const newOrder: OrderRecord = {
        id: orderId,
        orderNumber: orderNumber,
        customerId: customerId,
        customerName: customerName || 'Guest User',
        sellerId: sellerId,
        sellerName: sellerName,
        storeName: storeName || sellerName,
        items_json: JSON.stringify(items),
        subtotal: String(subtotal),
        deliveryCharge: String(deliveryCharge || '0'),
        platformFee: String(platformFee || '0'),
        tax: String(tax || '0'),
        grandTotal: String(grandTotal),
        paymentMethod: paymentMethod,
        deliveryAddress: deliveryAddress,
        latitude: String(latitude || '0'),
        longitude: String(longitude || '0'),
        status: 'Pending',
        createdAt: new Date().toISOString(),
        rejectReason: ''
      };

      await appendCsv<OrderRecord>('orders.csv', ORDER_COLUMNS, newOrder);
      return { success: true, order: newOrder };
    });
    return NextResponse.json({ success: true, order: result.order });
  } catch (error: any) {
    console.error('[ORDER ROUTE POST ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const customerId = searchParams.get('customerId');

    let orders = await readCsv<OrderRecord>('orders.csv', ORDER_COLUMNS).catch(() => []);

    if (shopId) {
      orders = orders.filter(o => o.sellerId === shopId);
    } else if (customerId) {
      orders = orders.filter(o => o.customerId === customerId);
    }

    // Format for return
    const formatted = orders.map(o => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerId: o.customerId,
      customerName: o.customerName,
      sellerId: o.sellerId,
      sellerName: o.sellerName,
      storeName: o.storeName,
      grandTotal: parseFloat(o.grandTotal || '0'),
      subtotal: parseFloat(o.subtotal || '0'),
      deliveryCharge: parseFloat(o.deliveryCharge || '0'),
      platformFee: parseFloat(o.platformFee || '0'),
      tax: parseFloat(o.tax || '0'),
      paymentMethod: o.paymentMethod,
      deliveryAddress: o.deliveryAddress,
      latitude: parseFloat(o.latitude || '0'),
      longitude: parseFloat(o.longitude || '0'),
      created_at: o.createdAt,
      status: o.status,
      items: JSON.parse(o.items_json || '[]'),
      rejectReason: o.rejectReason || ''
    }));

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error: any) {
    console.error('[ORDER ROUTE GET ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { orderId, status, rejectReason } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and Status are required' }, { status: 400 });
    }

    const orders = await readCsv<OrderRecord>('orders.csv', ORDER_COLUMNS).catch(() => []);
    const orderIdx = orders.findIndex(o => o.id === orderId);
    if (orderIdx === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const oldStatus = orders[orderIdx].status;
    if (oldStatus === status) {
      return NextResponse.json({ success: true, message: 'Status already up to date' });
    }

    const sellerId = orders[orderIdx].sellerId;

    // Use mutex to safely read/write products.csv
    await inventoryMutex.runExclusive(sellerId, async () => {
      // Parse order items
      const orderItems = JSON.parse(orders[orderIdx].items_json || '[]');

      // 1. If rejected or cancelled, restore reserved stock back to products.csv
      if ((status === 'Rejected' || status === 'Cancelled') && (oldStatus !== 'Rejected' && oldStatus !== 'Cancelled')) {
        const products = await readCsv<any>('products.csv', [
          'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
          'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
          'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
          'created_at', 'last_updated'
        ]);

        for (const item of orderItems) {
          const prodIdx = products.findIndex(p => p.id === item.id);
          if (prodIdx !== -1) {
            const currentStock = parseInt(products[prodIdx].stock) || 0;
            products[prodIdx].stock = String(currentStock + (item.quantity || 1));
          }
        }

        await writeCsv<any>('products.csv', [
          'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
          'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
          'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
          'created_at', 'last_updated'
        ], products);
      }

      // 2. If delivered, attribute sales sold and revenue in products.csv
      if (status === 'Delivered' && oldStatus !== 'Delivered') {
        const products = await readCsv<any>('products.csv', [
          'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
          'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
          'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
          'created_at', 'last_updated'
        ]);

        for (const item of orderItems) {
          const prodIdx = products.findIndex(p => p.id === item.id);
          if (prodIdx !== -1) {
            const currentSold = parseInt(products[prodIdx].sold) || 0;
            products[prodIdx].sold = String(currentSold + (item.quantity || 1));

            const currentRevenue = parseFloat(products[prodIdx].revenue || '0');
            products[prodIdx].revenue = String(currentRevenue + (item.quantity || 1) * parseFloat(products[prodIdx].price || '0'));
          }
        }

        await writeCsv<any>('products.csv', [
          'id', 'shop_id', 'name', 'category', 'brand', 'sku', 'barcode', 'description', 'price',
          'mrp', 'discount', 'gst', 'weight', 'dimensions', 'stock', 'min_stock_alert', 'supplier_name',
          'tags', 'delivery_type', 'images', 'thumbnail_url', 'views', 'sold', 'revenue', 'rating',
          'created_at', 'last_updated'
        ], products);
      }
    });

    orders[orderIdx].status = status;
    if (rejectReason !== undefined) {
      orders[orderIdx].rejectReason = rejectReason;
    }
    await writeCsv<OrderRecord>('orders.csv', ORDER_COLUMNS, orders);

    return NextResponse.json({ success: true, message: 'Order status updated' });
  } catch (error: any) {
    console.error('[ORDER ROUTE PATCH ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
