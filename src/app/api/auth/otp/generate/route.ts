import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import OTP from '@/utils/models/otpSchema';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, deviceId } = await req.json();
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate OTP
    // Create a new OTP instance and save it
    const otp = new OTP({
      userId: user._id,
      email,
      deviceId,
      code: Math.floor(100000 + Math.random() * 900000).toString(), // 6-digit code
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    });
    await otp.save();
    
    // Here you would typically send the OTP via email/SMS
    // For testing purposes, we'll return it (never do this in production)
    
    return NextResponse.json({ 
      message: 'OTP generated successfully',
      code: process.env.NODE_ENV === 'development' ? otp.code : undefined
    });
  } catch (error) {
    console.error('OTP generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate OTP' },
      { status: 500 }
    );
  }
}