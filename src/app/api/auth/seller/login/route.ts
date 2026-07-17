import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readCsv, SellerUser } from '@/lib/csvDb';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const sellers = await readCsv<SellerUser>('seller_users.csv', [
      'id',
      'business_name',
      'owner_name',
      'email',
      'password_hash',
      'created_at',
    ]);

    const lowercaseEmail = email.toLowerCase().trim();
    const user = sellers.find(u => u.email.toLowerCase().trim() === lowercaseEmail);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Create seller session (using business_name as session name)
    await setSession({
      id: user.id,
      email: user.email,
      role: 'seller',
      name: user.business_name,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: 'seller',
        name: user.business_name,
      },
    });
  } catch (error: any) {
    console.error('Seller login error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
