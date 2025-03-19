import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import Login from '@/utils/models/loginSchema';
import OTP from '@/utils/models/otpSchema';
import jwt from 'jsonwebtoken';
import { sendOTPEmail } from '@/utils/emailService';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, password, deviceId } = await req.json();
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check for existing session with this device
    const existingSession = await Login.findOne({
      userId: user._id,
      deviceId,
      isActive: true
    });
    
    // If no active session exists, generate OTP for verification
    if (!existingSession) {
      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
      const otp = new OTP({
        userId: user._id,
        email,
        deviceId,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      });
      await otp.save();
      
      // Send OTP via email
      await sendOTPEmail(email, code, user.name);
      
      return NextResponse.json({
        requiresOTP: true,
        message: 'OTP has been sent to your email address',
        // Only return code in development for testing
        code: process.env.NODE_ENV === 'development' ? code : undefined
      });
    }
    
    // If session exists, return token directly without OTP
    // Generate fresh JWT token with 30-day expiration
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );
    
    // Create response with token
    const response = NextResponse.json({
      message: 'Logged in successfully',
      userId: user._id
    });
    
    // Set cookie that expires in 30 days
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}