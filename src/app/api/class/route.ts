import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Class, { IClass } from '@/utils/models/classSchema';

// Connect to the database
connect();

// Generate a unique class ID based on grade and sequential number
async function generateClassId(grade: number): Promise<string> {
  // Format grade to 2 digits (e.g., 6 -> "06")
  const formattedGrade = grade.toString().padStart(2, '0');
  
  // Find the highest existing ID for this grade
  const prefix = `C${formattedGrade}`;
  const highestClass = await Class.findOne(
    { classId: new RegExp(`^${prefix}\\d+$`) },
    {},
    { sort: { classId: -1 } }
  );
  
  let nextNumber = 1;
  
  if (highestClass) {
    // Extract the numeric part after the prefix
    const match = highestClass.classId.substring(prefix.length);
    if (match) {
      nextNumber = parseInt(match) + 1;
    }
  }
  
  // Format the sequential number to 2 digits (e.g., 1 -> "01")
  const formattedNumber = nextNumber.toString().padStart(2, '0');
  
  // Combine to create the final ID (e.g., "C0601")
  return `${prefix}${formattedNumber}`;
}

// GET: Fetch all classes or filter by criteria
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const centerId = searchParams.get('centerId');

    // Filter by classId if provided
    if (classId) {
      const classObj = await Class.findOne({ classId });
      if (!classObj) {
        return NextResponse.json({ message: 'Class not found' }, { status: 404 });
      }
      return NextResponse.json(classObj);
    } 
    // Filter by centerId if provided
    else if (centerId) {
      const classes = await Class.find({ centerId: parseInt(centerId) });
      return NextResponse.json(classes);
    } 
    // Return all classes if no filters
    else {
      const classes = await Class.find({});
      return NextResponse.json(classes);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new class
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.centerId || !body.grade || !body.subject || 
        !body.schedule || !body.monthlyFee) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate the schedule field
    if (
      !body.schedule ||
      !Array.isArray(body.schedule.days) ||
      !body.schedule.days.length ||
      typeof body.schedule.startTime !== 'string' ||
      typeof body.schedule.endTime !== 'string'
    ) {
      return NextResponse.json({ message: 'Invalid schedule format' }, { status: 400 });
    }
    
    // Generate a unique class ID
    const classId = await generateClassId(body.grade);
    
    // Create a new class document
    const newClass = await Class.create({
      ...body,
      classId
    });
    
    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update an existing class
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure classId is provided for the update
    if (!body.classId) {
      return NextResponse.json({ message: 'Class ID is required' }, { status: 400 });
    }

    const { classId, ...updateData } = body;

    // Validate the schedule field
    if (
      updateData.schedule &&
      (!Array.isArray(updateData.schedule.days) ||
      !updateData.schedule.days.length ||
      typeof updateData.schedule.startTime !== 'string' ||
      typeof updateData.schedule.endTime !== 'string')
    ) {
      return NextResponse.json({ message: 'Invalid schedule format' }, { status: 400 });
    }

    // Find and update the class
    const updatedClass = await Class.findOneAndUpdate(
      { classId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(updatedClass);
  } catch (error: any) {
    console.error('Error in PATCH /api/class:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a class
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    if (!classId) {
      return NextResponse.json({ message: 'Class ID is required' }, { status: 400 });
    }
    
    const deletedClass = await Class.findOneAndDelete({ classId });
    
    if (!deletedClass) {
      return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
