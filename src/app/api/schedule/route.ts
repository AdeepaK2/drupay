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
    
    // Define the type for attendanceUpdate
    interface AttendanceUpdate {
      sid: string;
      present: boolean;
      notes?: string;
    }

    // Handle updating attendance if provided
    if (body.attendanceUpdates && Array.isArray(body.attendanceUpdates)) {
      // First, get the current schedule to check existing attendance entries
      const currentSchedule = await Schedule.findById(scheduleId);
      
      if (!currentSchedule) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
      }
      
      // Get all student IDs already in the attendance array
      const existingStudentIds = new Set(currentSchedule.attendance.map((a: any) => a.sid));
      
      // Split updates into existing students and new students
      const existingStudentUpdates: AttendanceUpdate[] = [];
      const newStudentUpdates: AttendanceUpdate[] = [];
      
      body.attendanceUpdates.forEach((update: AttendanceUpdate) => {
        if (!update.sid) return;
        
        if (existingStudentIds.has(update.sid)) {
          existingStudentUpdates.push(update);
        } else {
          newStudentUpdates.push(update);
        }
      });
      
      // Update existing students with bulkWrite
      if (existingStudentUpdates.length > 0) {
        const bulkOps = existingStudentUpdates.map(update => ({
          updateOne: {
            filter: { _id: scheduleId, "attendance.sid": update.sid },
            update: {
              $set: {
                "attendance.$.present": update.present,
                "attendance.$.notes": update.notes || ""
              }
            }
          }
        }));
        
        await Schedule.bulkWrite(bulkOps);
      }
      
      // Add new students with $push
      if (newStudentUpdates.length > 0) {
        await Schedule.findByIdAndUpdate(
          scheduleId,
          { 
            $push: { 
              attendance: { 
                $each: newStudentUpdates.map(update => ({
                  sid: update.sid,
                  present: update.present,
                  notes: update.notes || ""
                }))
              } 
            } 
          }
        );
      }
      
      delete body.attendanceUpdates;
    }
    
    // Update other schedule fields if needed (including status)
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

// PUT - Update a schedule
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }
    
    // Parse the request body to get update data
    const updateData = await request.json();
    
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Schedule updated successfully', 
      data: updatedSchedule 
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}