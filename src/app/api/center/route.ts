import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Center from '@/utils/models/centerSchema';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

// GET - Retrieve all centers or a specific center by cid
export async function GET(request: NextRequest) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');
    
    if (cid) {
      // Get specific center
      const center = await Center.findOne({ cid: parseInt(cid) });
      if (!center) {
        return NextResponse.json({ success: false, message: 'Center not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: center }, { status: 200 });
    } else {
      // Get all centers
      const centers = await Center.find({}).sort({ cid: 1 });
      return NextResponse.json({ success: true, data: centers }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch centers', error }, { status: 500 });
  }
}

// POST - Create a new center with auto-incremented cid
export async function POST(request: NextRequest) {
  await connectDB();
  
  try {
    const body = await request.json();
    
    // Find the highest cid and increment by 1
    const highestCidCenter = await Center.findOne().sort({ cid: -1 });
    const nextCid = highestCidCenter ? highestCidCenter.cid + 1 : 1;
    
    // Ensure the cid is within the allowed range (1-10)
    if (nextCid > 10) {
      return NextResponse.json({ 
        success: false, 
        message: 'Maximum number of centers reached (limit: 10)' 
      }, { status: 400 });
    }
    
    // Create new center with auto-incremented cid
    const newCenter = await Center.create({
      ...body,
      cid: nextCid
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Center created successfully', 
      data: newCenter 
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create center', 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete a center by cid
export async function DELETE(request: NextRequest) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');
    
    if (!cid) {
      return NextResponse.json({ success: false, message: 'Center ID is required' }, { status: 400 });
    }
    
    const deletedCenter = await Center.findOneAndDelete({ cid: parseInt(cid) });
    
    if (!deletedCenter) {
      return NextResponse.json({ success: false, message: 'Center not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Center deleted successfully',
      data: deletedCenter
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete center', error }, { status: 500 });
  }
}