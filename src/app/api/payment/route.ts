import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Payment, { PaymentStatus } from '@/utils/models/paymentSchema';
import Student from '@/utils/models/studentSchema';
import Enrollment, { EnrollmentStatus } from '@/utils/models/enrollmentSchema';
import Class from '@/utils/models/classSchema';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

function calculateProratedAmount(monthlyFee: number, enrollmentDate: Date, month: number, year: number, useSimpleProration: boolean = false): number {
  // Create date objects for the first and last day of the target month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); 
  const daysInMonth = endOfMonth.getDate();
  
  console.log('Start of month:', startOfMonth);
  console.log('End of month:', endOfMonth);
  console.log('Enrollment date:', enrollmentDate);
  console.log('Using simple proration:', useSimpleProration);
  
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

  // Calculate which week of the month the enrollment falls in
  const dayOfMonth = enrollmentDate.getDate();
  
  // For a simple week-based proration:
  // Week 1: days 1-7, Week 2: days 8-14, Week 3: days 15-21, Week 4+: days 22+
  let weekNumber = 1;
  if (dayOfMonth >= 8 && dayOfMonth <= 14) weekNumber = 2;
  else if (dayOfMonth >= 15 && dayOfMonth <= 21) weekNumber = 3;
  else if (dayOfMonth >= 22) weekNumber = 4;

  console.log('Enrollment week number:', weekNumber);
  
  // Calculate prorated amount based on weeks remaining
  const weeksInMonth = 4; // We consider a standard 4-week month for simplicity
  const remainingWeeks = weeksInMonth - weekNumber + 1;
  const proratedAmount = Math.round((remainingWeeks / weeksInMonth) * monthlyFee);
  
  console.log('Weeks remaining:', remainingWeeks);
  console.log('Prorated amount:', proratedAmount);
  
  return proratedAmount;
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
    const summary = searchParams.get('summary') === 'true';
    
    // If summary is requested, return payment summary stats
    if (summary && year && month) {
      // Build query for the specific month
      const query: any = { academicYear: year, month: month };
      
      // Get all payments for the month
      const allPayments = await Payment.find(query);
      
      // Calculate totals
      let totalReceived = 0;
      let byCash = 0;
      let byInvoice = 0;
      let totalPending = 0;
      
      allPayments.forEach(payment => {
        if (payment.status === PaymentStatus.PAID) {
          totalReceived += payment.amount || 0;
          
          // Count by payment method
          if (payment.paymentMethod === 'Cash') {
            byCash += payment.amount || 0;
          } else if (payment.paymentMethod === 'Invoice') {
            byInvoice += payment.amount || 0;
          }
        } else if (payment.status === PaymentStatus.PENDING) {
          totalPending += payment.amount || 0;
        }
      });
      
      // Get missing payments - students who are enrolled but don't have payment records
      const enrollments = await Enrollment.find({ status: EnrollmentStatus.ACTIVE });
      const missingPayments = [];
      
      for (const enrollment of enrollments) {
        // Check if there's a payment for this enrollment in the selected month/year
        const paymentExists = allPayments.some(
          payment => 
            payment.student.sid === enrollment.student.sid && 
            payment.class.classId === enrollment.class.classId
        );
        
        if (!paymentExists) {
          // Get class information to calculate potential missing amount
          const classObj = await Class.findOne({ classId: enrollment.class.classId });
          if (classObj) {
            const enrollmentDate = enrollment.startDate ? new Date(enrollment.startDate) : new Date(enrollment.createdAt);
            // Check if enrollment was active during this month
            const targetMonth = new Date(year, month-1, 1);
            const nextMonth = new Date(year, month, 1);
            
            // Only count if enrollment started before the end of this month
            if (enrollmentDate < nextMonth) {
              const amount = calculateProratedAmount(classObj.monthlyFee, enrollmentDate, month, year);
              
              if (amount > 0) {
                totalPending += amount;
                missingPayments.push({
                  student: enrollment.student,
                  class: enrollment.class,
                  amount,
                  dueDate: new Date(year, month-1, 28)
                });
              }
            }
          }
        }
      }
      
      return NextResponse.json({
        totalReceived,
        totalPending,
        byCash,
        byInvoice,
        total: totalReceived + totalPending,
        missingPayments
      });
    }
    
    // Standard payment fetching (existing logic)
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
    console.error('Error in payment GET:', error);
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
    
    // Use the useSimpleProration flag if provided
    const useSimpleProration = body.useSimpleProration === true;
    
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
    const amount = calculateProratedAmount(monthlyFee, enrollmentDate, body.month, body.academicYear, useSimpleProration);
    
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