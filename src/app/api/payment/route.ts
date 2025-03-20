import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Payment, { PaymentStatus } from '@/utils/models/paymentSchema';
import Student from '@/utils/models/studentSchema';
import Class from '@/utils/models/classSchema';
import Enrollment, { EnrollmentStatus } from '@/utils/models/enrollmentSchema';
import PaymentGenerationStatus from '@/utils/models/paymentGenerationStatusSchema';

// GET: Fetch payments with filters
export async function GET(request: NextRequest) {
  try {
    await connect();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;
    
    const query: any = {};
    
    if (studentId) query['student.sid'] = studentId;
    if (classId) query['class.classId'] = classId;
    if (status) query.status = status;
    if (month) query.month = month;
    if (year) query.academicYear = year;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find(query)
      .sort({ dueDate: 1 })
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

// POST: Generate monthly payments or create a specific payment
export async function POST(request: NextRequest) {
  try {
    await connect();
    const body = await request.json();
    
    // Check if current month payments should be auto-generated
    if (body.checkCurrentMonth === true) {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const year = currentDate.getFullYear();
      
      const result = await generateMonthlyPayments(month, year);
      return NextResponse.json({
        ...result,
        message: `Auto-generated payments for ${month}/${year}: ${result.message}`
      });
    }
    
    // Batch generation of monthly payments
    if (body.generateMonthly === true) {
      if (!body.month || !body.year) {
        return NextResponse.json({ 
          error: 'Month and year are required for batch payment generation' 
        }, { status: 400 });
      }
      
      const result = await generateMonthlyPayments(body.month, body.year);
      return NextResponse.json(result);
    }
    
    // For creating a single payment
    const requiredFields = ['student', 'class', 'academicYear', 'month', 'amount', 'paymentMethod'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Check for duplicate payment
    const existingPayment = await Payment.findOne({
      'student.sid': body.student.sid,
      'class.classId': body.class.classId,
      academicYear: body.academicYear,
      month: body.month
    });
    
    if (existingPayment) {
      return NextResponse.json({ 
        error: 'Payment record already exists for this student, class, month and year' 
      }, { status: 409 });
    }
    
    const payment = await Payment.create(body);
    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update payment status or details
export async function PATCH(request: NextRequest) {
  try {
    await connect();
    const body = await request.json();
    
    if (!body._id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    const updateData: any = {};
    
    // Handle payment status update
    if (body.status === PaymentStatus.PAID) {
      updateData.status = PaymentStatus.PAID;
      updateData.paidDate = body.paidDate || new Date();
      if (body.receiptNumber) updateData.receiptNumber = body.receiptNumber;
    } else if (body.status) {
      updateData.status = body.status;
    }
    
    // Handle invoice sent update
    if (body.invoiceSent === true) {
      updateData.invoiceSent = true;
      updateData.invoiceSentDate = body.invoiceSentDate || new Date();
      if (body.invoiceNumber) updateData.invoiceNumber = body.invoiceNumber;
    }
    
    // Other updates
    if (body.notes) updateData.notes = body.notes;
    if (body.amount) updateData.amount = body.amount;
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      body._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to generate monthly payments using enrollment data
async function generateMonthlyPayments(month: number, year: number) {
  try {
    // First check if payments were already generated for this month
    const existingGeneration = await PaymentGenerationStatus.findOne({ month, year });
    
    // If we already generated payments and the process was complete, we can skip
    if (existingGeneration && existingGeneration.isComplete) {
      return {
        success: true,
        message: `Payments were already generated for ${month}/${year}`,
        newCount: 0,
        skipCount: existingGeneration.count
      };
    }
    
    // Mark that we're starting generation (in case of interruptions)
    await PaymentGenerationStatus.findOneAndUpdate(
      { month, year },
      { 
        isComplete: false,
        generatedAt: new Date(),
        count: 0
      },
      { upsert: true }
    );
    
    // Get all active enrollments
    const enrollments = await Enrollment.find({ 
      status: EnrollmentStatus.ACTIVE 
    });
    
    const payments = [];
    let newCount = 0;
    let skipCount = 0;
    
    // Generate payments based on active enrollments
    for (const enrollment of enrollments) {
      // Check if payment already exists for this enrollment
      const existingPayment = await Payment.findOne({
        'student.sid': enrollment.student.sid,
        'class.classId': enrollment.class.classId,
        academicYear: year,
        month: month
      });
      
      if (existingPayment) {
        skipCount++;
        continue;
      }
      
      // Get class details to determine fee
      const classObj = await Class.findOne({ classId: enrollment.class.classId });
      if (!classObj) continue; // Skip if class no longer exists
      
      // Get student details to determine payment method
      const student = await Student.findOne({ sid: enrollment.student.sid });
      if (!student) continue; // Skip if student no longer exists
      
      // Calculate the due date (e.g., 5th of the month)
      const dueDate = new Date(year, month - 1, 5);
      
      // Calculate the fee (accounting for any adjustments in the enrollment)
      let amount = classObj.monthlyFee;
      if (enrollment.feeAdjustment) {
        if (enrollment.feeAdjustment.type === 'discount') {
          amount = amount * (1 - (enrollment.feeAdjustment.value / 100));
        } else if (enrollment.feeAdjustment.type === 'waiver') {
          amount = 0;
        } else if (enrollment.feeAdjustment.type === 'custom') {
          amount = enrollment.feeAdjustment.value;
        }
      }
      
      const payment = {
        student: {
          sid: student.sid,
          name: student.name,
          email: student.email
        },
        class: {
          classId: classObj.classId,
          name: classObj.name
        },
        academicYear: year,
        month: month,
        amount: amount,
        dueDate: dueDate,
        status: amount === 0 ? PaymentStatus.WAIVED : PaymentStatus.PENDING,
        paymentMethod: student.paymentMethod,
        invoiceSent: false,
        remindersSent: 0
      };
      
      payments.push(payment);
      newCount++;
    }
    
    // Bulk insert all payments
    if (payments.length > 0) {
      await Payment.insertMany(payments, { ordered: false });
    }
    
    // Record successful generation
    await PaymentGenerationStatus.findOneAndUpdate(
      { month, year },
      { 
        isComplete: true,
        count: newCount
      },
      { upsert: true }
    );
    
    return { 
      success: true, 
      message: `Generated ${newCount} new payment records, skipped ${skipCount} existing records`,
      newCount,
      skipCount
    };
  } catch (error: any) {
    console.error("Error generating monthly payments:", error);
    return { success: false, error: error.message };
  }
}

// Add this function to your route.ts file
// Checks if a specific month's payments have been generated
async function checkMonthlyPaymentsGenerated(month: number, year: number): Promise<boolean> {
  const status = await PaymentGenerationStatus.findOne({ month, year });
  return !!status && status.isComplete;
}