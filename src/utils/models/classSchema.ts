import mongoose, { Document, Schema } from 'mongoose';

// Interface for a class document
export interface IClass extends Document {
    classId: string;
  name: string;
  centerId: number; // Changed from mongoose.Types.ObjectId to number
  grade: number;
  subject: string;
  schedule: {
    days: string[]; // Array of days: can include one or more days of the week
    startTime: string;
    endTime: string;
  };
  monthlyFee: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const classSchema = new Schema<IClass>(
  {
    classId: {
      type: String, // Changed from Schema.Types.ObjectId to Number
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    centerId: {
      type: Number, // Changed from Schema.Types.ObjectId to Number
      ref: 'Center', 
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer'
      }
    },
    grade: {
      type: Number,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    schedule: {
      days: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      }],
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
    },
    monthlyFee: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, // This will automatically add createdAt and updatedAt fields
  }
);

// Create and export the model
export const Class = mongoose.model<IClass>('Class', classSchema);

export default Class;