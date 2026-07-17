import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readCsv, CustomerUser } from '@/lib/csvDb';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const customers = await readCsv<CustomerUser>('customer_users.csv', [
      'id',
      'full_name',
      'email',
      'password_hash',
      'created_at',
    ]);

    const lowercaseEmail = email.toLowerCase().trim();
    const user = customers.find(u => u.email.toLowerCase().trim() === lowercaseEmail);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Create customer session
    await setSession({
      id: user.id,
      email: user.email,
      role: 'customer',
      name: user.full_name,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: 'customer',
        name: user.full_name,
      },
    });
  } catch (error: any) {
    console.error('Customer login error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
