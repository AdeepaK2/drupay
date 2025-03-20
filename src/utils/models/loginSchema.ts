import mongoose, { Document, Schema } from 'mongoose';

// Interface for Login document
export interface ILogin extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  deviceId: string;
  loginTime: Date;
  logoutTime: Date | null;
  isActive: boolean;
  ipAddress: string;
  location: {
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  endSession(): Promise<ILogin>;
}

const loginSchema = new Schema<ILogin>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  userAgent: String
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Method to end a session
loginSchema.methods.endSession = function(): Promise<ILogin> {
  this.logoutTime = new Date();
  this.isActive = false;
  return this.save();
};

// Prevent model recompilation
const Login = mongoose.models.Login || mongoose.model<ILogin>('Login', loginSchema);

export default Login;