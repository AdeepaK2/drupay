import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Schedule from '@/utils/models/scheduleSchema';
import Class from '@/utils/models/classSchema';
import Enrollment from '@/utils/models/enrollmentSchema';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

// GET scheduled classes and attendance
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const date = searchParams.get('date');
    
    const query: any = {};
    
    if (classId) query.classId = classId;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (date) query.date = new Date(date);
    
    const schedules = await Schedule.find(query).sort({ date: 1 });
    
    return NextResponse.json(schedules, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.classId || !body.date) {
      return NextResponse.json({ error: 'Class ID and date are required' }, { status: 400 });
    }
    
    // Check if the class exists
    const classDoc = await Class.findOne({ classId: body.classId });
    if (!classDoc) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Parse the date string to a Date object
    const scheduleDate = new Date(body.date);
    
    // Extract month and year from the date
    const month = scheduleDate.getMonth() + 1; // Adding 1 because getMonth() returns 0-11
    const year = scheduleDate.getFullYear();
    
    // Get day of week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[scheduleDate.getDay()];
    
    // Use the class's default times if not provided
    const startTime = body.startTime || classDoc.schedule.startTime;
    const endTime = body.endTime || classDoc.schedule.endTime;
    
    // Check if a schedule already exists for this class on this date
    const existingSchedule = await Schedule.findOne({
      classId: body.classId,
      date: {
        $gte: new Date(scheduleDate.setHours(0, 0, 0, 0)),
        $lt: new Date(scheduleDate.setHours(23, 59, 59, 999))
      }
    });
    
    if (existingSchedule) {
      return NextResponse.json({ error: 'A schedule already exists for this class on this date' }, { status: 409 });
    }
    
    // Get enrolled students for pre-populating attendance
    const enrollments = await Enrollment.find({
      classId: body.classId,
      status: 'active'
    });
    
    // Create attendance array with enrolled students
    const attendance = enrollments.map(enrollment => ({
      sid: enrollment.sid,
      present: false
    }));
    
    // Create the schedule with computed fields
    const newSchedule = await Schedule.create({
      ...body,
      month,
      year,
      dayOfWeek,
      startTime,
      endTime,
      attendance: attendance
    });
    
    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update schedule or mark attendance
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    if (!body._id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }
    
    const scheduleId = body._id;
    delete body._id;
    
    // Handle updating attendance if provided
    if (body.attendanceUpdates && Array.isArray(body.attendanceUpdates)) {
      // For each student in the attendance updates
      for (const update of body.attendanceUpdates) {
        if (!update.sid) continue;
        
        await Schedule.updateOne(
          { _id: scheduleId, "attendance.sid": update.sid },
          { 
            $set: { 
              "attendance.$.present": update.present,
              "attendance.$.notes": update.notes || ""
            } 
          }
        );
      }
      
      delete body.attendanceUpdates;
    }
    
    // Update other schedule fields if needed
    if (Object.keys(body).length > 0) {
      await Schedule.findByIdAndUpdate(
        scheduleId,
        { $set: body },
        { new: true, runValidators: true }
      );
    }
    
    const updatedSchedule = await Schedule.findById(scheduleId);
    
    if (!updatedSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedSchedule, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a schedule
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }
    
    const deletedSchedule = await Schedule.findByIdAndDelete(id);
    
    if (!deletedSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Schedule deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}