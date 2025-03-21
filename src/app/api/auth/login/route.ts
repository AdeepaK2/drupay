import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import Login from '@/utils/models/loginSchema';
import OTP from '@/utils/models/otpSchema';
import jwt from 'jsonwebtoken';
import { compare } from 'bcryptjs';
import { sendOTPEmail } from '@/utils/emailService';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse JSON with error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { email, password, deviceId } = body;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
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
    
    let requiresOTP = false;
    
    // If no active session exists, generate OTP for verification
    if (!existingSession) {
      requiresOTP = true;
      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
      const otp = new OTP({
        userId: user._id,
        email,
        deviceId,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      await otp.save();
      
      // Send OTP via email
      await sendOTPEmail(email, code, user.name);
      
      // For development, return the OTP code
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          requiresOTP: true,
          message: 'OTP required for verification',
          code: process.env.NODE_ENV === 'development' ? code : undefined
        });
      } else {
        return NextResponse.json({
          requiresOTP: true,
          message: 'OTP required for verification'
        });
      }
    }
    
    // If session exists or OTP not required, return token directly
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );
    
    // Create response with token
    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      userId: user._id
    });
    
    // Set cookie with secure settings
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
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