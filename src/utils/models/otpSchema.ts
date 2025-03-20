import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  deviceId: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isValid(): boolean;
  markAsUsed(): Promise<IOTP>;
}

const otpSchema = new Schema<IOTP>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Default expiration time: 10 minutes after creation
      return new Date(Date.now() + 10 * 60 * 1000);
    }
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Add your methods
otpSchema.methods.isValid = function(): boolean {
  return !this.isUsed && new Date() < this.expiresAt;
};

otpSchema.methods.markAsUsed = function(): Promise<IOTP> {
  this.isUsed = true;
  return this.save();
};

// Prevent model recompilation
const OTP = mongoose.models.OTP || mongoose.model<IOTP>('OTP', otpSchema);

export default OTP;