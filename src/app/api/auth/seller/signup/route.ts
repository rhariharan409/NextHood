import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readCsv, appendCsv, SellerUser } from '@/lib/csvDb';

export async function POST(req: Request) {
  try {
    const {
      storeName,
      ownerName,
      email,
      mobileNumber,
      password,
      confirmPassword,
      businessCategory,
      gstNumber,
      storeAddress,
      latitude,
      longitude,
      storeLogo
    } = await req.json();

    // 1. Validation
    if (!storeName || !ownerName || !email || !mobileNumber || !password || !confirmPassword || !businessCategory || !storeAddress || !latitude || !longitude) {
      return NextResponse.json({ error: 'All required fields must be completed.' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Mobile Number format validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber.trim())) {
      return NextResponse.json({ error: 'Mobile number must be a valid 10-digit number.' }, { status: 400 });
    }

    // Password length
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
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
    const cleanMobile = mobileNumber.trim();

    if (sellers.some(user => user.email.toLowerCase().trim() === lowercaseEmail)) {
      return NextResponse.json({ error: 'Store Email already registered.' }, { status: 400 });
    }

    if (sellers.some(user => user.mobile_number.trim() === cleanMobile)) {
      return NextResponse.json({ error: 'Mobile number already registered.' }, { status: 400 });
    }

    // 3. Hash password and save new seller record
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newSeller: SellerUser = {
      id: crypto.randomUUID(),
      store_name: storeName.trim(),
      owner_name: ownerName.trim(),
      email: lowercaseEmail,
      mobile_number: cleanMobile,
      password_hash: passwordHash,
      business_category: businessCategory,
      gst_number: (gstNumber || '').trim(),
      store_address: storeAddress.trim(),
      latitude: String(latitude),
      longitude: String(longitude),
      store_logo: (storeLogo || '').trim() || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&auto=format&fit=crop&q=60',
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
