import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Store the last check time to avoid checking too frequently
let lastCheckTime = 0;
const CHECK_INTERVAL = 1000 * 60 * 60; // 1 hour

export async function middleware(request: NextRequest) {
  const now = Date.now();
  
  // Only run the check if it's been more than an hour since the last check
  if (now - lastCheckTime > CHECK_INTERVAL) {
    lastCheckTime = now;
    
    try {
      // Run the payment status check - don't await to avoid blocking
      fetch(`${request.nextUrl.origin}/api/system/payments/check-current-month`, {
        method: 'POST',
        headers: {
          'x-system-check': 'true',
        },
      }).catch(err => console.error('Background payment check error:', err));
      
      console.log('Triggered payment generation check');
    } catch (error) {
      console.error('Failed to trigger payment check:', error);
    }
  }
  
  return NextResponse.next();
}

// Only apply this middleware to specific paths to limit its execution frequency
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};