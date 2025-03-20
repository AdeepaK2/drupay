import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import OTP from '@/utils/models/otpSchema';
import Login from '@/utils/models/loginSchema';
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
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }
    
    // Check if OTP is valid
    if (!otp.isValid()) {
      return NextResponse.json(
        { error: 'OTP expired' },
        { status: 400 }
      );
    }
    
    // Mark OTP as used
    await otp.markAsUsed();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );
    
    // Get IP and location info
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Create login session
    await Login.create({
      userId: user._id,
      email: user.email,
      deviceId,
      ipAddress: ip,
      userAgent,
      isActive: true
    });
    
    // Create response
    const response = NextResponse.json({ 
      verified: true, 
      message: 'Login successful',
      userId: user._id,
      name: user.name,
      email: user.email
    });
    
    // Set cookie with secure settings
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}