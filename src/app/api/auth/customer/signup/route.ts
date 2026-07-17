import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readCsv, appendCsv, CustomerUser } from '@/lib/csvDb';

export async function POST(req: Request) {
  try {
    const { fullName, email, password, confirmPassword } = await req.json();

    // 1. Validation
    if (!fullName || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Password minimum 8 characters
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // Passwords match
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // 2. Check customer_users.csv
    const customers = await readCsv<CustomerUser>('customer_users.csv', [
      'id',
      'full_name',
      'email',
      'password_hash',
      'created_at',
    ]);

    const lowercaseEmail = email.toLowerCase().trim();
    const emailExists = customers.some(user => user.email.toLowerCase().trim() === lowercaseEmail);
    if (emailExists) {
      return NextResponse.json({ error: 'Account already exists.' }, { status: 400 });
    }

    // 3. Hash password and store record
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: CustomerUser = {
      id: crypto.randomUUID(),
      full_name: fullName.trim(),
      email: lowercaseEmail,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    await appendCsv<CustomerUser>('customer_users.csv', [
      'id',
      'full_name',
      'email',
      'password_hash',
      'created_at',
    ], newUser);

    return NextResponse.json({ success: true, message: 'Signup successful.' });
  } catch (error: any) {
    console.error('Customer signup error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
