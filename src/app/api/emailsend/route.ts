import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Student from '@/utils/models/studentSchema';
import EmailLog from '@/utils/models/emailsendSchema';
import { sendParentEmail } from '@/utils/emailService';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

// POST - Send email to parent
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['studentId', 'subject', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Find the student to get parent's email
    const student = await Student.findOne({ sid: body.studentId });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    if (!student.parent || !student.parent.email) {
      return NextResponse.json({ error: 'Parent email not found for this student' }, { status: 404 });
    }
    
    // Prepare HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${body.subject}</h2>
        <p>Dear Parent/Guardian of ${student.name},</p>
        <div>
          ${body.message}
        </div>
        <p style="margin-top: 20px;">Best regards,<br>Dr U Education</p>
      </div>
    `;
    
    // Send the email
    const emailResult = await sendParentEmail(
      student.parent.email,
      body.subject,
      htmlContent
    );
    
    // Log email send attempt
    const emailLog = await EmailLog.create({
      studentId: body.studentId,
      parentEmail: student.parent.email,
      subject: body.subject,
      message: body.message,
      status: emailResult.success ? 'success' : 'failed',
      errorMessage: emailResult.error ? String(emailResult.error) : undefined
    });
    
    if (!emailResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send email', 
        error: emailResult.error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: emailResult.messageId,
      logId: emailLog._id
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Retrieve email logs
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
    
    const logs = await EmailLog.find(query)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await EmailLog.countDocuments(query);
    
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