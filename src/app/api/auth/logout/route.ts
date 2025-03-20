import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/utils/db';
import jwt from 'jsonwebtoken';
import Login from '@/utils/models/loginSchema';

export async function POST(req: NextRequest) {
  try {
    // Get the auth token from cookies
    const token = req.cookies.get('auth_token')?.value;
    
    // Clear the auth cookie
    cookies().delete('auth_token');
    
    // If there's a token, mark login sessions as inactive (optional)
    if (token) {
      try {
        // Verify the token to get user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
        
        if (decoded.userId) {
          // Connect to database
          await dbConnect();
          
          // Update all active sessions for this user
          await Login.updateMany(
            { userId: decoded.userId, isActive: true },
            { isActive: false, logoutTime: new Date() }
          );
        }
      } catch (jwtError) {
        // If token is invalid, just continue with logout
        console.log('Invalid token during logout:', jwtError);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}