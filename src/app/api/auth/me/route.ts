import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readCsv, ShopRecord } from '@/lib/csvDb';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let profileCompleted = true;
    if (session.role === 'seller') {
      try {
        const shops = await readCsv<ShopRecord>('shops.csv', ['seller_id']);
        const hasShop = shops.some(s => s.seller_id === session.id);
        if (!hasShop) {
          profileCompleted = false;
        }
      } catch {
        profileCompleted = false;
      }
    }

    return NextResponse.json({ authenticated: true, user: session, profileCompleted });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json({ authenticated: false, error: 'Internal server error' }, { status: 500 });
  }
}
