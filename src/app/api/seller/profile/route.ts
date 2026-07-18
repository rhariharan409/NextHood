import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { appendCsv, ShopRecord } from '@/lib/csvDb';
import crypto from 'crypto';

const SHOP_COLUMNS: (keyof ShopRecord)[] = [
  'id',
  'seller_id',
  'name',
  'category',
  'description',
  'address',
  'city',
  'state',
  'pincode',
  'latitude',
  'longitude',
  'phone_number',
  'opening_time',
  'closing_time',
  'logo',
  'status',
  'created_at'
];

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();

    const newShop: ShopRecord = {
      id: crypto.randomUUID(),
      seller_id: session.id,
      name: (body.shopName || '').trim(),
      category: (body.category || 'Grocery Store').trim(),
      description: (body.description || '').trim(),
      address: (body.address || '').trim(),
      city: (body.city || '').trim(),
      state: (body.state || '').trim(),
      pincode: (body.pincode || '').trim(),
      latitude: String(body.latitude || '12.9229'),
      longitude: String(body.longitude || '80.1275'),
      phone_number: (body.phoneNumber || '').trim(),
      opening_time: (body.openingTime || '09:00').trim(),
      closing_time: (body.closingTime || '21:00').trim(),
      logo: (body.logo || '').trim(),
      status: 'Active',
      created_at: new Date().toISOString()
    };

    if (!newShop.name || !newShop.address || !newShop.latitude || !newShop.longitude || !newShop.phone_number) {
      return NextResponse.json({ error: 'All mandatory fields must be completed.' }, { status: 400 });
    }

    await appendCsv<ShopRecord>('shops.csv', SHOP_COLUMNS, newShop);

    return NextResponse.json({ success: true, message: 'Shop profile completed successfully.', shop: newShop });
  } catch (error: any) {
    console.error('[PROFILE SIGNUP ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
