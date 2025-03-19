import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Login from '@/utils/models/loginSchema';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { deviceId } = await req.json();
    const userId = req.headers.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find active session
    const session = await Login.findOne({
      userId,
      deviceId,
      isActive: true
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      );
    }
    
    // End session
    await session.endSession();
    
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}