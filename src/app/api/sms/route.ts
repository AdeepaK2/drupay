import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Student from '@/utils/models/studentSchema';
import SMSLog from '@/utils/models/smsLogSchema';
import { sendSMS } from '@/utils/smsService';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

// POST - Send SMS to parent
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['studentId', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Find the student to get parent's phone number
    const student = await Student.findOne({ sid: body.studentId });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    if (!student.parent || !student.parent.contactNumber) {
      return NextResponse.json({ error: 'Parent phone number not found for this student' }, { status: 404 });
    }
    
    // Create a pending log entry (phone will be formatted in the sendSMS function)
    const smsLog = await SMSLog.create({
      studentId: body.studentId,
      parentPhone: student.parent.contactNumber, // Original unformatted phone
      message: body.message,
      status: 'pending'
    });
    
    // Send the SMS using the sendSMS function which handles formatting
    const smsResult = await sendSMS(
      student.parent.contactNumber,
      body.message,
      body.sender || 'DrUPay'
    );
    
    // Update the log with the result
    if (smsResult.success) {
      await SMSLog.findByIdAndUpdate(smsLog._id, {
        status: 'success',
        messageId: smsResult.messageId,
        cost: smsResult.cost
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'SMS sent successfully',
        messageId: smsResult.messageId,
        logId: smsLog._id
      }, { status: 200 });
    } else {
      await SMSLog.findByIdAndUpdate(smsLog._id, {
        status: 'failed',
        errorMessage: smsResult.error
      });
      
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send SMS', 
        error: smsResult.error 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in SMS route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Retrieve SMS logs
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    let query = {};
    if (studentId) {
      query = { studentId };
    }
    
    const logs = await SMSLog.find(query)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await SMSLog.countDocuments(query);
    
    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Batch send SMS to multiple students
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.message || !body.message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    if (!body.studentIds || !Array.isArray(body.studentIds) || body.studentIds.length === 0) {
      return NextResponse.json({ error: 'At least one student ID is required' }, { status: 400 });
    }
    
    // Process each student
    const results = [];
    const sender = body.sender || 'DrUPay';
    
    for (const studentId of body.studentIds) {
      // Find student
      const student = await Student.findOne({ sid: studentId });
      
      if (!student || !student.parent || !student.parent.contactNumber) {
        results.push({
          studentId,
          success: false,
          error: 'Student not found or missing parent contact number'
        });
        continue;
      }
      
      // Create log entry with original phone number
      const smsLog = await SMSLog.create({
        studentId,
        parentPhone: student.parent.contactNumber,
        message: body.message,
        status: 'pending'
      });
      
      // Send SMS (phone formatting is handled in the sendSMS function)
      const smsResult = await sendSMS(
        student.parent.contactNumber,
        body.message,
        sender
      );
      
      // Update log and collect result
      if (smsResult.success) {
        await SMSLog.findByIdAndUpdate(smsLog._id, {
          status: 'success',
          messageId: smsResult.messageId,
          cost: smsResult.cost
        });
        
        results.push({
          studentId,
          success: true,
          messageId: smsResult.messageId,
          logId: smsLog._id
        });
      } else {
        await SMSLog.findByIdAndUpdate(smsLog._id, {
          status: 'failed',
          errorMessage: smsResult.error
        });
        
        results.push({
          studentId,
          success: false,
          error: smsResult.error
        });
      }
    }
    
    // Count successes and failures
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: failed === 0, // Only true if all messages succeeded
      message: `${successful} of ${results.length} messages sent successfully`,
      results
    }, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}