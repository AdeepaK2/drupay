import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentGenerationStatus extends Document {
  year: number;
  month: number;
  generatedAt: Date;
  generatedBy: string;
  count: number;
  isComplete: boolean;
}

const paymentGenerationStatusSchema = new Schema<IPaymentGenerationStatus>(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: String, default: 'system' },
    count: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Create compound index for year and month
paymentGenerationStatusSchema.index({ year: 1, month: 1 }, { unique: true });

// Check if model exists before creating
const PaymentGenerationStatus = mongoose.models.PaymentGenerationStatus || 
  mongoose.model<IPaymentGenerationStatus>('PaymentGenerationStatus', paymentGenerationStatusSchema);

export default PaymentGenerationStatus;