import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  try {
    // First check for cookie-based authentication
    const authCookie = request.cookies.get('auth_token');
    
    // Check Authorization header if no cookie
    const authHeader = request.headers.get('Authorization')?.split(' ')[1];
    
    const token = authCookie?.value || authHeader;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const decoded = verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret'
    ) as JwtPayload;
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      // Clear the invalid cookie if it exists
      const response = NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
      
      if (authCookie) {
        response.cookies.delete('auth_token');
      }
      
      return response;
    }
    
    // Create a new request with userId in the headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('userId', decoded.userId as string);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Clear invalid cookie if it exists
    const response = NextResponse.json(
      { error: 'Invalid authentication' },
      { status: 401 }
    );
    
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: [
    '/api/user/:path*',
    '/api/auth/logout',
    // Add other protected routes here
  ],
};