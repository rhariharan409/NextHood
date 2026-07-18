import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readCsv, appendCsv, SellerUser } from '@/lib/csvDb';

export async function POST(req: Request) {
  try {
    const {
      businessName,
      ownerName,
      email,
      password,
      confirmPassword
    } = await req.json();

    // 1. Validation
    if (!businessName || !ownerName || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All required fields must be completed.' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Enter a valid Business Email.' }, { status: 400 });
    }

    // Password length
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must contain at least 8 characters.' }, { status: 400 });
    }

    // Passwords match
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // 2. Check duplicates in seller_users.csv
    const sellers = await readCsv<SellerUser>('seller_users.csv', [
      'id',
      'store_name',
      'owner_name',
      'email',
      'mobile_number',
      'password_hash',
      'business_category',
      'gst_number',
      'store_address',
      'latitude',
      'longitude',
      'store_logo',
      'created_at'
    ]);

    const lowercaseEmail = email.toLowerCase().trim();

    if (sellers.some(user => user.email.toLowerCase().trim() === lowercaseEmail)) {
      return NextResponse.json({ error: 'This Business Email is already registered.' }, { status: 400 });
    }

    // 3. Hash password and save new seller record
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newSeller: SellerUser = {
      id: crypto.randomUUID(),
      store_name: businessName.trim(),
      owner_name: ownerName.trim(),
      email: lowercaseEmail,
      mobile_number: '',
      password_hash: passwordHash,
      business_category: '',
      gst_number: '',
      store_address: '',
      latitude: '',
      longitude: '',
      store_logo: '',
      created_at: new Date().toISOString()
    };

    await appendCsv<SellerUser>('seller_users.csv', [
      'id',
      'store_name',
      'owner_name',
      'email',
      'mobile_number',
      'password_hash',
      'business_category',
      'gst_number',
      'store_address',
      'latitude',
      'longitude',
      'store_logo',
      'created_at'
    ], newSeller);

    return NextResponse.json({ success: true, message: 'Seller registration successful.' });
  } catch (error: any) {
    console.error('Seller signup error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
