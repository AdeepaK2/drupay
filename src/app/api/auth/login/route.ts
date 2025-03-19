import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import Login from '@/utils/models/loginSchema';
import jwt from 'jsonwebtoken';

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
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
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
    
    return NextResponse.json({ token, userId: user._id });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}