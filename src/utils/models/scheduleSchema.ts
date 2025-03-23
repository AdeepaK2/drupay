import mongoose, { Document, Schema } from 'mongoose';

// Interface for attendance record
export interface IAttendance extends Document {
  sid: string; // Student ID
  present: boolean;
  notes?: string;
}

// Interface for a class schedule document
export interface ISchedule extends Document {
  classId: string;
  date: Date;
  month: number; // 1-12 for January-December
  year: number;
  dayOfWeek: string; // e.g., 'Monday', 'Tuesday', etc.
  status: 'scheduled' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  notes?: string;
  attendance: IAttendance[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition for attendance
const attendanceSchema = new Schema<IAttendance>({
  sid: {
    type: String,
    required: true,
  },
  present: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
});

// Schema definition for schedule
const scheduleSchema = new Schema<ISchedule>(
  {
    classId: {
      type: String,
      required: true,
      ref: 'Class',
    },
    date: {
      type: Date,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    dayOfWeek: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    attendance: {
      type: [attendanceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for classId and date to ensure uniqueness
scheduleSchema.index({ classId: 1, date: 1 }, { unique: true });

// Check if the model is already defined
const Schedule = mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', scheduleSchema);

export default Schedule;