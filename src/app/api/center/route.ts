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
      // Get specific center - use lean() for better performance on read operations
      const center = await Center.findOne({ cid: parseInt(cid) }).lean();
      if (!center) {
        return NextResponse.json({ success: false, message: 'Center not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: center }, { status: 200 });
    } else {
      // Get all centers - use projection to only get needed fields and lean() for better performance
      // Sort by cid for consistent ordering
      const centers = await Center.find({}, 'cid name location admissionFee').sort({ cid: 1 }).lean();
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

// PUT - Update a center by cid
export async function PUT(request: NextRequest) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');
    
    if (!cid) {
      return NextResponse.json({ success: false, message: 'Center ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    const updatedCenter = await Center.findOneAndUpdate(
      { cid: parseInt(cid) },
      { 
        name: body.name,
        location: body.location,
        admissionFee: body.admissionFee
      },
      { new: true } // Return the updated document
    );
    
    if (!updatedCenter) {
      return NextResponse.json({ success: false, message: 'Center not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Center updated successfully',
      data: updatedCenter
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update center', 
      error: error.message 
    }, { status: 500 });
  }
}