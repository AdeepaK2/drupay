import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ isLoggedIn: false });
    }
    
    try {
      // Verify the token
      const decoded = verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;
      
      // Connect to DB
      await dbConnect();
      
      // Find user
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return NextResponse.json({ isLoggedIn: false });
      }
      
      // Return user data
      return NextResponse.json({
        isLoggedIn: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
          // Add other fields you need
        }
      });
    } catch (jwtError) {
      // Invalid token
      console.error('Invalid token:', jwtError);
      return NextResponse.json({ isLoggedIn: false });
    }
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Failed to check session', isLoggedIn: false },
      { status: 500 }
    );
  }
}