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
  feeAdjustment?: {
    type: 'discount' | 'waiver' | 'custom';
    value: number; // Percentage for discount, fixed amount for custom
    reason?: string;
  };
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
    feeAdjustment: {
      type: { 
        type: String, 
        enum: ['discount', 'waiver', 'custom']
      },
      value: { type: Number },
      reason: { type: String }
    },
    notes: { type: String }
  },
  { timestamps: true }
);

// Create compound index for student-class combination
enrollmentSchema.index({ 'student.sid': 1, 'class.classId': 1 }, { unique: true });

// Add indexes for common queries
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrollmentDate: 1 });

// Check if model exists before creating
const Enrollment = mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;