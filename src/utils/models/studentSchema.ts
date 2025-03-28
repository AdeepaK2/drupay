import mongoose, { Schema, Document } from 'mongoose';

export interface IParent {
  name: string;
  email: string;
  contactNumber: string;
}

export interface IAdmissionFeeStatus {
  paid: boolean;
  paidDate?: Date;
  amount?: number;
  receiptNumber?: string;
}

export interface IStudent extends Document {
  sid: string
  name: string;
  email: string;
  contactNumber: string;
  paymentMethod: 'Cash' | 'Invoice';
  parent: IParent;
  joinedDate: Date;
  admissionFeeStatus: IAdmissionFeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  { 
    sid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    paymentMethod: { 
      type: String, 
      required: true,
      enum: ['Cash', 'Invoice']
    },
    parent: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      contactNumber: { type: String, required: true }
    },
    joinedDate: { type: Date, default: Date.now },
    admissionFeeStatus: {
      paid: { type: Boolean, default: false },
      paidDate: { type: Date },
      amount: { type: Number },
      receiptNumber: { type: String }
    }
  },
  { timestamps: true } // This automatically adds createdAt and updatedAt fields
);

// Add indexes for better query performance
studentSchema.index({ sid: 1 }); // Index for student ID (unique)
studentSchema.index({ email: 1 }); // Index for email (unique)
studentSchema.index({ 'parent.email': 1 }); // Index for parent's email
studentSchema.index({ joinedDate: 1 }); // Index for joined date (e.g., sorting or filtering by date)
studentSchema.index({ 'admissionFeeStatus.paid': 1 }); // Index for admission fee payment status

// Check if model exists before creating to avoid overwrite during hot reloads
const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', studentSchema);

export default Student;