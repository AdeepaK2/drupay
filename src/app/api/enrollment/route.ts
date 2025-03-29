import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Enrollment, { EnrollmentStatus } from '@/utils/models/enrollmentSchema';
import Student from '@/utils/models/studentSchema';
import Class from '@/utils/models/classSchema';
import { calculateProratedAmount } from '@/utils/paymentUtils';

// Connect to the database
connect();

// GET: Fetch enrollments with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    
    const query: any = {};
    
    if (studentId) query['student.sid'] = studentId;
    if (classId) query['class.classId'] = classId;
    if (status) query.status = status;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    const enrollments = await Enrollment.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Enrollment.countDocuments(query);
    
    return NextResponse.json({
      enrollments,
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

// POST: Create a new enrollment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check required fields
    if (!body.student || !body.student.sid || !body.class || !body.class.classId) {
      return NextResponse.json({ 
        error: 'Student ID and Class ID are required' 
      }, { status: 400 });
    }
    
    // Verify the student exists
    const student = await Student.findOne({ sid: body.student.sid });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Verify the class exists
    const classObj = await Class.findOne({ classId: body.class.classId });
    if (!classObj) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Check for duplicate enrollment
    const existingEnrollment = await Enrollment.findOne({
      'student.sid': body.student.sid,
      'class.classId': body.class.classId
    });
    
    if (existingEnrollment) {
      return NextResponse.json({ 
        error: 'Student is already enrolled in this class',
        enrollment: existingEnrollment
      }, { status: 409 });
    }
    
    // Create enrollment object with student and class names
    const enrollmentData = {
      ...body,
      student: {
        sid: student.sid,
        name: student.name
      },
      class: {
        classId: classObj.classId,
        name: classObj.name
      }
    };
    
    const enrollment = await Enrollment.create(enrollmentData);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update enrollment status or details
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body._id) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }
    
    // Handle status changes
    if (body.status === EnrollmentStatus.WITHDRAWN || body.status === EnrollmentStatus.COMPLETED) {
      // If ending the enrollment, automatically set the end date if not provided
      if (!body.endDate) {
        body.endDate = new Date();
      }
    }
    
    // Debug: Log what we're trying to update
    console.log('Updating enrollment with ID:', body._id);
    console.log('Raw update data:', body);
    
    // Create a clean update object with only the fields we want to update
    const updateData: any = {};
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    // Get original enrollment to check for adjustedFee changes
    const originalEnrollment = await Enrollment.findById(body._id);
    if (!originalEnrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    // Flag to track if adjustedFee was changed
    let adjustedFeeChanged = false;
    let newAdjustedFee = null;
    
    // Handle adjustedFee specifically - ensure it's a number
    if (body.adjustedFee !== undefined) {
      // Convert to number and handle potential NaN values
      const adjustedFeeValue = Number(body.adjustedFee);
      if (!isNaN(adjustedFeeValue)) {
        updateData.adjustedFee = adjustedFeeValue;
        newAdjustedFee = adjustedFeeValue;
        console.log('Setting adjustedFee to:', adjustedFeeValue);
        
        // Check if value actually changed
        if (originalEnrollment.adjustedFee !== adjustedFeeValue) {
          adjustedFeeChanged = true;
        }
      } else {
        console.warn('Invalid adjustedFee value:', body.adjustedFee);
      }
    }
    
    console.log('Processed update data:', updateData);
    
    // Directly update the record
    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      body._id,
      updateData,  // Use direct update object instead of $set
      { new: true, runValidators: true }
    );
    
    if (!updatedEnrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    // Update payment records if adjustedFee changed
    if (adjustedFeeChanged) {
      try {
        // Import Payment model dynamically to avoid circular dependencies
        const Payment = (await import('@/utils/models/paymentSchema')).default;
        
        // Find all payment records for this student and class
        const payments = await Payment.find({
          'student.sid': updatedEnrollment.student.sid,
          'class.classId': updatedEnrollment.class.classId
        });
        
        console.log(`Found ${payments.length} payment records to update`);
        
        // Update each payment record with recalculated amount
        for (const payment of payments) {
          // Get enrollment date
          const enrollmentDate = updatedEnrollment.startDate ? 
            new Date(updatedEnrollment.startDate) : 
            new Date(updatedEnrollment.createdAt);
            
          // Calculate prorated amount based on new adjustedFee
          let newAmount;
          
          // Use the calculateProratedAmount function
          newAmount = calculateProratedAmount(
            newAdjustedFee ?? originalEnrollment.adjustedFee, // Use the new adjusted fee or fall back to original
            enrollmentDate,
            payment.month,
            payment.academicYear
          );
          
          console.log(`Updating payment ${payment._id}: old amount=${payment.amount}, new amount=${newAmount}`);
          
          // Update the payment amount
          await Payment.findByIdAndUpdate(
            payment._id,
            { 
              amount: newAmount,
              notes: payment.notes + ` Amount adjusted to ${newAmount} based on enrollment fee change.`
            }
          );
        }
        
        console.log('Successfully updated payment records with new adjusted fee');
      } catch (error) {
        console.error('Error updating payment records:', error);
        // Don't fail the whole operation if payment updates fail
      }
    }
    
    // Debug: Log the updated enrollment
    console.log('Updated enrollment:', updatedEnrollment);
    
    return NextResponse.json(updatedEnrollment);
  } catch (error: any) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an enrollment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }
    
    const deletedEnrollment = await Enrollment.findByIdAndDelete(id);
    
    if (!deletedEnrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Enrollment deleted successfully',
      deletedEnrollment
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}