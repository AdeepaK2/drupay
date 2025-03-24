import mongoose, { Document, Schema } from 'mongoose';

// Interface for a class document
export interface IClass extends Document {
  classId: string;
  name: string;
  centerId: number;
  grade: number;
  subject: string;
  schedule: {
    days: string[];
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
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    centerId: {
      type: Number,
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
      days: {
        type: [String],
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      }
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

// Add indexes for better performance
classSchema.index({ classId: 1 }); // Primary lookup field
classSchema.index({ centerId: 1 }); // Frequently filtered by center
classSchema.index({ grade: 1 }); // Filter by grade
classSchema.index({ subject: 1 }); // Filter by subject
classSchema.index({ grade: 1, subject: 1 }); // Compound index for filtering by both
classSchema.index({ name: 'text', subject: 'text' }); // Text search on name and subject

// Check if the model is already defined to prevent the "Cannot overwrite model once compiled" error
const Class = mongoose.models.Class || mongoose.model<IClass>('Class', classSchema);

// Export default
export default Class;
