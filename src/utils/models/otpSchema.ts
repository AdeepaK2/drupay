import mongoose, { Document, Schema } from 'mongoose';

// Interface for OTP document
export interface IOTP extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  code: string;
  deviceId: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  
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
});

// Check if OTP is valid (not expired and not used)
otpSchema.methods.isValid = function(): boolean {
  return !this.isUsed && new Date() < this.expiresAt;
};

// Mark OTP as used
otpSchema.methods.markAsUsed = function(): Promise<IOTP> {
  this.isUsed = true;
  return this.save();
};

// Static method to generate a new OTP
otpSchema.statics.generateOTP = function(
  userId: mongoose.Types.ObjectId,
  email: string,
  deviceId: string,
  expiresInMinutes: number = 10
): Promise<IOTP> {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  return this.create({
    userId,
    email,
    code,
    deviceId,
    expiresAt
  });
};

const OTP = mongoose.model<IOTP>('OTP', otpSchema);

export default OTP;