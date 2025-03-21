import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Payment, { PaymentStatus } from '@/utils/models/paymentSchema';
import Student from '@/utils/models/studentSchema';
import Enrollment from '@/utils/models/enrollmentSchema';
import Class from '@/utils/models/classSchema';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

function calculateProratedAmount(monthlyFee: number, enrollmentDate: Date, month: number, year: number): number {
  // Create date objects for the first and last day of the target month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); 
  const daysInMonth = endOfMonth.getDate();
  
  console.log('Start of month:', startOfMonth);
  console.log('End of month:', endOfMonth);
  console.log('Enrollment date:', enrollmentDate);
  
  // If enrollment is before the month starts, charge full fee
  if (enrollmentDate < startOfMonth) {
    console.log('Enrollment before month - full fee:', monthlyFee);
    return monthlyFee;
  }
  
  // If enrollment is after the month ends, no charge
  if (enrollmentDate > endOfMonth) {
    console.log('Enrollment after month - no fee');
    return 0;
  }

  // Calculate the number of weeks in the month (rounded up)
  const weeksInMonth = Math.ceil(daysInMonth / 7);
  console.log('Weeks in month:', weeksInMonth);
  
  // Calculate which week of the month the enrollment falls in (1-based)
  const dayOfMonth = enrollmentDate.getDate();
  const enrollmentWeek = Math.ceil(dayOfMonth / 7);
  console.log('Enrollment week:', enrollmentWeek);
  
  // Calculate remaining weeks in month
  const remainingWeeks = weeksInMonth - enrollmentWeek + 1;
  console.log('Remaining weeks:', remainingWeeks);
  
  // Proration rules:
  // 1. If enrolled in first 60% of the month (3 weeks in a 5-week month), charge full fee
  // 2. If enrolled in last 40% of the month, prorate based on remaining weeks
  
  const thresholdWeek = Math.ceil(weeksInMonth * 0.6);
  console.log('Threshold week:', thresholdWeek);
  
  if (enrollmentWeek <= thresholdWeek) {
    console.log('Enrolled in first 60% of month - full fee:', monthlyFee);
    return monthlyFee;
  } else {
    // Calculate prorated amount based on remaining weeks
    const proratedAmount = Math.round((remainingWeeks / weeksInMonth) * monthlyFee);
    console.log('Prorated amount based on weeks:', proratedAmount);
    return proratedAmount;
  }
}

// GET payments with filtering options
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const studentSid = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const status = searchParams.get('status');
    
    // Build query based on provided parameters
    const query: any = {};
    
    if (studentSid) query['student.sid'] = studentSid;
    if (classId) query['class.classId'] = classId;
    if (year) query.academicYear = year;
    if (month) query.month = month;
    if (status) query.status = status;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find(query)
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Payment.countDocuments(query);
    
    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new payment record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['studentId', 'classId', 'academicYear', 'month'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Find the student
    const student = await Student.findOne({ sid: body.studentId });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Find the class
    const classObj = await Class.findOne({ classId: body.classId });
    if (!classObj) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Check if student is enrolled in this class
    const enrollment = await Enrollment.findOne({
      'student.sid': body.studentId,
      'class.classId': body.classId
    });
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Student is not enrolled in this class' }, { status: 400 });
    }
    
    // Check if payment already exists for this student, class, year and month
    const existingPayment = await Payment.findOne({
      'student.sid': body.studentId,
      'class.classId': body.classId,
      academicYear: body.academicYear,
      month: body.month
    });
    
    if (existingPayment) {
      return NextResponse.json({ 
        error: 'Payment record already exists for this student, class, month and year',
        payment: existingPayment
      }, { status: 409 });
    }
    
    // Calculate due date (usually last day of the month or can be customized)
    const dueDate = new Date(body.academicYear, body.month - 1, 28); // 28th of the month
    
    // Calculate prorated amount if student joined mid-month
    // Check if startDate exists in enrollment, otherwise use createdAt as fallback
    let enrollmentDate;
    if (enrollment.startDate) {
      // Make sure we have a proper Date object
      enrollmentDate = new Date(enrollment.startDate);
      
      // Check if the date is valid, if not use createdAt as fallback
      if (isNaN(enrollmentDate.getTime())) {
        console.log('Invalid enrollment start date, using createdAt as fallback');
        enrollmentDate = new Date(enrollment.createdAt);
      }
    } else {
      // Fallback to when the enrollment was created
      console.log('No enrollment start date found, using createdAt as fallback');
      enrollmentDate = new Date(enrollment.createdAt);
    }
    
    console.log('Parsed enrollment date:', enrollmentDate);
    
    const monthlyFee = classObj.monthlyFee;
    const amount = calculateProratedAmount(monthlyFee, enrollmentDate, body.month, body.academicYear);
    
    // Create payment object
    const paymentData = {
      student: {
        sid: student.sid,
        name: student.name,
        email: student.email
      },
      class: {
        classId: classObj.classId,
        name: classObj.name
      },
      academicYear: body.academicYear,
      month: body.month,
      amount: amount,
      dueDate: dueDate,
      status: PaymentStatus.PENDING,
      paymentMethod: student.paymentMethod,
      invoiceSent: false,
      remindersSent: 0,
      notes: body.notes || ''
    };
    
    // If amount is 0 (fully prorated), mark as waived
    if (amount === 0) {
      paymentData.status = PaymentStatus.WAIVED;
      paymentData.notes += ' Payment waived due to enrollment after month end.';
    }
    
    const newPayment = await Payment.create(paymentData);
    
    // Calculate month details for debugging
    const endOfMonth = new Date(body.academicYear, body.month, 0);
    
    return NextResponse.json({
      payment: newPayment,
      debug: {
        enrollmentDate: enrollmentDate.toString(),
        startOfMonth: new Date(body.academicYear, body.month - 1, 1).toString(),
        endOfMonth: endOfMonth.toString(),
        monthlyFee,
        calculatedAmount: amount,
        weeksInMonth: Math.ceil(endOfMonth.getDate() / 7),
        enrollmentWeek: Math.ceil(enrollmentDate.getDate() / 7)
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update payment status or details
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    if (!body._id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    // Special handling for payment status changes
    if (body.status === PaymentStatus.PAID && !body.paidDate) {
      body.paidDate = new Date();
    }
    
    // Update invoice sent status if marked
    if (body.invoiceSent === true && !body.invoiceSentDate) {
      body.invoiceSentDate = new Date();
    }
    
    // Update reminder count if sent
    if (body.sendReminder === true) {
      body.remindersSent = (body.remindersSent || 0) + 1;
      body.lastReminderDate = new Date();
      delete body.sendReminder; // Remove the flag before updating
    }
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      body._id,
      { $set: body },
      { new: true, runValidators: true }
    );
    
    if (!updatedPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a payment record
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    const deletedPayment = await Payment.findByIdAndDelete(id);
    
    if (!deletedPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Payment record deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}