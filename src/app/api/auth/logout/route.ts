import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/utils/db';
import jwt from 'jsonwebtoken';
import Login from '@/utils/models/loginSchema';

export async function POST(req: NextRequest) {
  try {
    // Get the auth token from cookies
    const token = req.cookies.get('auth_token')?.value;
    
    // Create a response object first
    const response = NextResponse.json({ success: true });
    
    // Clear the auth cookie with the same attributes as when it was set
    response.cookies.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
    });
    
    // If there's a token, mark login sessions as inactive
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
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}