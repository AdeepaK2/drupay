import { NextRequest, NextResponse } from 'next/server';
import { hash, compare } from 'bcrypt';
import dbConnect from '@/utils/db';
import User from '@/utils/models/user';
import OTP from '@/utils/models/otpSchema';
import Login from '@/utils/models/loginSchema';

// Register user
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, password, name } = await req.json();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create new user
    const user = await User.create({
      email,
      password: hashedPassword,
      name
    });

    return NextResponse.json(
      { message: 'User registered successfully', userId: user._id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}

// Get user profile
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get userId from request (you'll need auth middleware)
    const userId = req.headers.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// Update user
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get userId from request (you'll need auth middleware)
    const userId = req.headers.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await req.json();
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}