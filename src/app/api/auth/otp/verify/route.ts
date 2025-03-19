import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import OTP from '@/utils/models/otpSchema';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, code, deviceId } = await req.json();
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find OTP
    const otp = await OTP.findOne({
      userId: user._id,
      email,
      code,
      deviceId,
      isUsed: false
    });
    
    if (!otp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }
    
    // Check if OTP is valid
    if (!otp.isValid()) {
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }
    
    // Mark OTP as used
    await otp.markAsUsed();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    
    return NextResponse.json({ token, verified: true });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}