import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';

export async function GET(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('auth_token');
    
    if (!authCookie) {
      return NextResponse.json({ 
        isLoggedIn: false 
      });
    }
    
    // Verify token
    try {
      const decoded = verify(
        authCookie.value, 
        process.env.JWT_SECRET || 'fallback_secret'
      ) as JwtPayload;
      
      await dbConnect();
      
      // Check if user exists
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return NextResponse.json({ isLoggedIn: false });
      }
      
      // User is logged in
      return NextResponse.json({
        isLoggedIn: true,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      // Invalid token
      const response = NextResponse.json({ isLoggedIn: false });
      response.cookies.delete('auth_token');
      return response;
    }
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    );
  }
}