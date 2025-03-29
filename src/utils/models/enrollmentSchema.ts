import mongoose, { Schema, Document } from 'mongoose';
import { IStudent } from './studentSchema';
import { IClass } from './classSchema';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  WITHDRAWN = 'withdrawn',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed'
}

export interface IEnrollment extends Document {
  student: {
    sid: string;
    name: string;
  };
  class: {
    classId: string;
    name: string;
  };
  enrollmentDate: Date;
  status: EnrollmentStatus;
  endDate?: Date;
  adjustedFee?: number; // The final fee amount after any discounts or adjustments
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: {
      sid: { 
        type: String, 
        required: true,
        ref: 'Student'
      },
      name: { type: String, required: true }
    },
    class: {
      classId: { 
        type: String, 
        required: true,
        ref: 'Class'
      },
      name: { type: String, required: true }
    },
    enrollmentDate: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    status: { 
      type: String, 
      enum: Object.values(EnrollmentStatus),
      default: EnrollmentStatus.ACTIVE,
      required: true 
    },
    endDate: { type: Date },
    adjustedFee: {
      type: Number,
      description: 'The final fee amount after any discounts or adjustments'
    },
    notes: { type: String }
  },
  { timestamps: true }
);

// Add indexes for efficient querying
enrollmentSchema.index({ 'student.sid': 1 }); // Index for student ID
enrollmentSchema.index({ 'class.classId': 1 }); // Index for class ID
enrollmentSchema.index({ 'student.sid': 1, 'class.classId': 1 }, { unique: true }); // Compound index for student and class (unique)
enrollmentSchema.index({ status: 1 }); // Index for enrollment status
enrollmentSchema.index({ enrollmentDate: 1 }); // Index for enrollment date

// Check if model exists before creating
const Enrollment = mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;