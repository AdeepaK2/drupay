import mongoose, { Document, Schema } from 'mongoose';
import { hash, compare } from 'bcrypt';


// Interface for User document
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    name: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true, // Automatically create createdAt and updatedAt fields
  }
);


export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
