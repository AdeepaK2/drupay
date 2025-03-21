import mongoose, { Document, Schema } from 'mongoose';

// Interface for a class document
export interface IClass extends Document {
    classId: string;
  name: string;
  centerId: number; // Changed from mongoose.Types.ObjectId to number
  grade: number;
  subject: string;
  schedule: string;
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
      type: String,
      required: true,
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

// Check if the model is already defined to prevent the "Cannot overwrite model once compiled" error
const Class = mongoose.models.Class || mongoose.model<IClass>('Class', classSchema);

// Export default
export default Class;