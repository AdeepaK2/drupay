import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WAIVED = 'waived'
}

export interface IPayment extends Document {
  student: {
    sid: string;
    name: string;
    email: string;
  };
  class: {
    classId: string;
    name: string;
  };
  academicYear: number;
  month: number; // 1-12 representing January to December
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  paymentMethod: 'Cash' | 'Invoice';
  
  // Payment details
  paidDate?: Date;
  receiptNumber?: string;
  
  // Invoice tracking
  invoiceSent: boolean;
  invoiceSentDate?: Date;
  invoiceNumber?: string;
  
  // Reminder tracking
  remindersSent: number;
  lastReminderDate?: Date;
  notes?: string;
}

const paymentSchema = new Schema<IPayment>(
  {
    student: {
      sid: { type: String, required: true, index: true },
      name: { type: String, required: true },
      email: { type: String, required: true }
    },
    class: {
      classId: { type: String, required: true, index: true },
      name: { type: String, required: true }
    },
    academicYear: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING 
    },
    paymentMethod: { 
      type: String, 
      required: true,
      enum: ['Cash', 'Invoice']
    },
    paidDate: { type: Date },
    receiptNumber: { type: String },
    invoiceSent: { type: Boolean, default: false },
    invoiceSentDate: { type: Date },
    invoiceNumber: { type: String },
    remindersSent: { type: Number, default: 0 },
    lastReminderDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

// Add indexes for efficient querying
paymentSchema.index({ 'student.sid': 1 }); // Index for student ID
paymentSchema.index({ 'class.classId': 1 }); // Index for class ID
paymentSchema.index({ academicYear: 1, month: 1 }); // Compound index for academic year and month
paymentSchema.index({ 'student.sid': 1, academicYear: 1, month: 1 }); // Compound index for student, year, and month
paymentSchema.index({ status: 1 }); // Index for payment status
paymentSchema.index({ dueDate: 1 }); // Index for due date (e.g., overdue payments)

// Check if model exists before creating
const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;