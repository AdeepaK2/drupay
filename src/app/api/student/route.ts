import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import Student from '@/utils/models/studentSchema';
import Counter from '@/utils/models/counterSchema';
import Payment, { PaymentStatus } from '@/utils/models/paymentSchema';
import Enrollment from '@/utils/models/enrollmentSchema';

// GET all students
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const sid = searchParams.get('sid');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // If sid is provided, search for specific student
    if (sid) {
      const student = await Student.find({ sid });
      return NextResponse.json({ students: student }, { status: 200 });
    }
    
    // Otherwise return paginated students
    const students = await Student.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Student.countDocuments();
    
    return NextResponse.json({
      students,
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

// POST - Create a new student
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'contactNumber', 'paymentMethod', 'parent'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Check if student already exists with the same email
    const existingStudent = await Student.findOne({ email: body.email });
    if (existingStudent) {
      return NextResponse.json({ error: 'Student with this email already exists' }, { status: 409 });
    }
    
    // Get the next sequence number from counter collection
    const counter = await Counter.findByIdAndUpdate(
      'studentId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    // Generate the student ID with padded zeros (e.g., 0001, 0002, etc.)
    const paddedId = counter.seq.toString().padStart(4, '0');
    
    // Add the generated sid to the student data
    const studentData = {
      ...body,
      sid: paddedId
    };
    
    // Create new student with the generated ID
    const newStudent = await Student.create(studentData);
    
    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connect();
    const body = await request.json();
    
    // Get the student SID which is required for the update
    const sid = body.sid;
    if (!sid) {
      return NextResponse.json({ error: 'Student SID is required' }, { status: 400 });
    }
    
    // Create update object, removing sid to avoid trying to update it
    const updateData = { ...body };
    delete updateData.sid;
    delete updateData._id; // Also remove _id if present to avoid MongoDB errors
    
    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    // Handle field name compatibility - if 'date' is present, move it to 'paidDate'
    if (updateData.admissionFeeStatus?.date && !updateData.admissionFeeStatus.paidDate) {
      updateData.admissionFeeStatus.paidDate = updateData.admissionFeeStatus.date;
      delete updateData.admissionFeeStatus.date;
    }
    
    // Special handling for nested fields
    const flattenedUpdate: { [key: string]: any } = {};
    
    Object.keys(updateData).forEach(key => {
      if (key === 'parent' && typeof updateData.parent === 'object') {
        Object.keys(updateData.parent).forEach(parentKey => {
          flattenedUpdate[`parent.${parentKey}`] = updateData.parent[parentKey];
        });
      } else if (key === 'admissionFeeStatus' && typeof updateData.admissionFeeStatus === 'object') {
        Object.keys(updateData.admissionFeeStatus).forEach(feeKey => {
          flattenedUpdate[`admissionFeeStatus.${feeKey}`] = updateData.admissionFeeStatus[feeKey];
        });
      } else {
        flattenedUpdate[key] = updateData[key];
      }
    });
    
    // Make sure paymentMethod is one of the allowed values
    if (flattenedUpdate.paymentMethod && !['Cash', 'Invoice'].includes(flattenedUpdate.paymentMethod)) {
      return NextResponse.json({ 
        error: 'Invalid payment method. Must be "Cash" or "Invoice".' 
      }, { status: 400 });
    }
    
    // Find and update the student
    const updatedStudent = await Student.findOneAndUpdate(
      { sid: sid },
      { $set: flattenedUpdate },
      { new: true, runValidators: true }
    );
    
    if (!updatedStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Student updated successfully',
      student: updatedStudent 
    }, { status: 200 });
  } catch (error: any) {
    // Special handling for duplicate key errors (e.g., email already exists)
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: 'Duplicate field value entered',
        field: Object.keys(error.keyValue)[0]
      }, { status: 409 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a student
export async function DELETE(request: NextRequest) {
  try {
    await connect();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const sid = searchParams.get('sid'); // Allow deletion by SID too
    
    if (!id && !sid) {
      return NextResponse.json({ error: 'Student ID or SID is required' }, { status: 400 });
    }
    
    // Find the student first to get their SID
    const studentQuery = id ? { _id: id } : { sid: sid };
    const student = await Student.findOne(studentQuery);
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Get student's SID for related deletions
    const studentSid = student.sid;
    
    // 1. Delete all PENDING payments for this student
    // Keep PAID payments for financial records
    const deletedPayments = await Payment.deleteMany({
      'student.sid': studentSid,
      'status': PaymentStatus.PENDING
    });
    
    // 2. Delete all enrollments for this student
    const deletedEnrollments = await Enrollment.deleteMany({
      'student.sid': studentSid
    });
    
    // 3. Delete the student
    const deletedStudent = await Student.findByIdAndDelete(student._id);
    
    return NextResponse.json({ 
      message: 'Student deleted successfully', 
      deletedPaymentCount: deletedPayments.deletedCount,
      deletedEnrollmentCount: deletedEnrollments.deletedCount
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}