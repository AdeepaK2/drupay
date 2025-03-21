import connect from '@/utils/db';
import Payment, { PaymentStatus } from '@/utils/models/paymentSchema';
import Student from '@/utils/models/studentSchema';
import Class from '@/utils/models/classSchema';
import Enrollment, { EnrollmentStatus } from '@/utils/models/enrollmentSchema';
import PaymentGenerationStatus from '@/utils/models/paymentGenerationStatusSchema';

export async function generateMonthlyPayments(month: number, year: number) {
  try {
    await connect();
    
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
    const enrollments = await Enrollment.find({ status: EnrollmentStatus.ACTIVE });
    
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
      
      // Calculate the fee with any adjustments
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
    // Mark generation as incomplete in case of errors
    try {
      await PaymentGenerationStatus.findOneAndUpdate(
        { month, year },
        { isComplete: false }
      );
    } catch (e) {
      // Ignore errors during error handling
    }
    
    console.error("Error generating monthly payments:", error);
    return { success: false, error: error.message };
  }
}